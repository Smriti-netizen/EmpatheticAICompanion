import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiClientError } from "../../shared/api/client";
import { AsciiBloom } from "../../components/AsciiBloom";
import { Diamond } from "../../components/Diamond";
import { SessionTimer } from "../../components/SessionTimer";
import { UserCameraPip } from "../../components/UserCameraPip";
import { useUserCamera } from "../../hooks/useUserCamera";
import { getAvatarId, getLocale, setAvatarId } from "../../lib/storage";
import {
  playBase64Audio,
  speakWithBrowserTts,
  stopExclusiveAudio,
  unlockAudioPlayback,
} from "../../lib/audio";
import type { AvatarExpression, AvatarId } from "../avatar/avatarCatalog";
import { getAvatar } from "../avatar/avatarCatalog";
import { LiveCatAvatar } from "../avatar/LiveCatAvatar";
import { presenceToExpression, usePresenceCues } from "./usePresenceCues";
import { useFreeSpeechLoop } from "./useFreeSpeechLoop";
import { useServerVoiceLoop } from "./useServerVoiceLoop";

function asAvatarId(value: string | null | undefined): AvatarId {
  return value === "aura" || value === "spark" || value === "hop" ? value : "hop";
}

export function CallRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const camera = useUserCamera();
  const [avatarId, setAvatarState] = useState<AvatarId>(() => asAvatarId(getAvatarId()));
  const [locale, setLocaleState] = useState(() => getLocale());

  const [remaining, setRemaining] = useState(2700);
  const [starting, setStarting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listenActive, setListenActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ summary: string; homework: string } | null>(
    null,
  );
  const [showType, setShowType] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [draft, setDraft] = useState("");
  const [expression, setExpression] = useState<AvatarExpression>("calm");
  const [serverVoice, setServerVoice] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const pendingAudioRef = useRef<{
    text: string;
    audioBase64?: string | null;
    audioMime: string;
    finish: () => void;
  } | null>(null);

  const presence = usePresenceCues(camera.videoRef, camera.enabled && listenActive);
  const messagesRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const busyRef = useRef(false);
  const endingRef = useRef(false);
  const turnAbortRef = useRef<AbortController | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const speakingRef = useRef(false);
  const finishSpeakingRef = useRef<(() => void) | null>(null);
  /** Monotonic token — stale playCounselor calls must not start a second voice. */
  const playGenRef = useRef(0);
  const playCounselorRef = useRef<
    (text: string, audioBase64?: string | null, audioMime?: string) => Promise<void>
  >(async () => {});
  /** Invalidates in-flight session boot (Strict Mode remount / dep churn). */
  const bootGenRef = useRef(0);

  const stopVoice = useCallback(() => {
    playGenRef.current += 1;
    stopExclusiveAudio(true);
    audioElRef.current = null;
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const interruptSpeaking = useCallback(() => {
    if (!speakingRef.current) return;
    stopVoice();
    setCaption("");
    finishSpeakingRef.current?.();
  }, [stopVoice]);

  const stopAi = useCallback(() => {
    turnAbortRef.current?.abort();
    turnAbortRef.current = null;
    stopVoice();
    finishSpeakingRef.current?.();
    busyRef.current = false;
    setBusy(false);
    setCaption("");
    setListenActive(true);
  }, [stopVoice]);

  const playCounselor = useCallback(
    async (text: string, audioBase64?: string | null, audioMime = "audio/mpeg") => {
      const gen = ++playGenRef.current;
      stopExclusiveAudio(true);
      audioElRef.current = null;

      setListenActive(false);
      setSpeaking(true);
      speakingRef.current = true;
      setCaption(text);
      // Safety net only — real end is audio.onended. Short estimates were cutting TTS mid-sentence.
      const safetyMs = Math.min(180000, Math.max(20000, text.split(/\s+/).length * 700));

      await new Promise<void>((resolve) => {
        let done = false;
        let safetyTimer = 0;
        const stillCurrent = () => gen === playGenRef.current;
        const finish = () => {
          if (done) return;
          if (!stillCurrent()) {
            done = true;
            resolve();
            return;
          }
          const el = audioElRef.current;
          // Don't end the turn while edge-tts is still audible — wait for onended.
          if (el && !el.paused && !el.ended) {
            el.addEventListener("ended", () => finish(), { once: true });
            return;
          }
          done = true;
          if (safetyTimer) window.clearTimeout(safetyTimer);
          finishSpeakingRef.current = null;
          pendingAudioRef.current = null;
          setNeedsAudioTap(false);
          resolve();
        };
        finishSpeakingRef.current = () => {
          if (done) return;
          done = true;
          stopExclusiveAudio(true);
          if (safetyTimer) window.clearTimeout(safetyTimer);
          finishSpeakingRef.current = null;
          pendingAudioRef.current = null;
          setNeedsAudioTap(false);
          resolve();
        };
        safetyTimer = window.setTimeout(finish, safetyMs);

        if (audioBase64) {
          // Server audio only — never also start browser TTS (that was a double-voice path).
          void playBase64Audio(audioBase64, audioMime, () => {
            if (stillCurrent()) finish();
          })
            .then((el) => {
              if (!stillCurrent()) {
                el.pause();
                return;
              }
              audioElRef.current = el;
              setNeedsAudioTap(false);
              const bumpSafety = () => {
                if (!Number.isFinite(el.duration) || el.duration <= 0) return;
                window.clearTimeout(safetyTimer);
                safetyTimer = window.setTimeout(finish, el.duration * 1000 + 2000);
              };
              if (el.readyState >= 1) bumpSafety();
              else el.onloadedmetadata = bumpSafety;
            })
            .catch((err: unknown) => {
              if (!stillCurrent()) return;
              const name = err instanceof DOMException ? err.name : "";
              if (name === "AbortError") {
                finish();
                return;
              }
              if (name === "NotAllowedError") {
                pendingAudioRef.current = { text, audioBase64, audioMime, finish };
                setNeedsAudioTap(true);
                return;
              }
              // Last resort only when server audio truly failed — exclusive stop first.
              stopExclusiveAudio(true);
              speakWithBrowserTts(text, finish, { avatarId, locale });
            });
        } else {
          speakWithBrowserTts(text, finish, { avatarId, locale });
        }
      });

      if (gen !== playGenRef.current) return;
      audioElRef.current = null;
      speakingRef.current = false;
      setSpeaking(false);
      setListenActive(true);
    },
    [avatarId, locale],
  );

  playCounselorRef.current = playCounselor;

  const resumePendingAudio = useCallback(async () => {
    const pending = pendingAudioRef.current;
    if (!pending) {
      setNeedsAudioTap(false);
      return;
    }
    await unlockAudioPlayback();
    setNeedsAudioTap(false);
    try {
      if (pending.audioBase64) {
        const el = await playBase64Audio(
          pending.audioBase64,
          pending.audioMime,
          pending.finish,
        );
        audioElRef.current = el;
        return;
      }
    } catch {
      // fall through to browser TTS
    }
    speakWithBrowserTts(pending.text, pending.finish, { avatarId, locale });
  }, [avatarId, locale]);

  const handleUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!id || !trimmed || busyRef.current || summary) return;
      turnAbortRef.current?.abort();
      const ac = new AbortController();
      turnAbortRef.current = ac;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setListenActive(false);
      messagesRef.current = [...messagesRef.current, { role: "user", content: trimmed }];
      setCaption(`You: ${trimmed}`);
      try {
        const result = await api.sessionChat(id, trimmed, {
          avatarId,
          locale,
        });
        if (ac.signal.aborted) return;
        setRemaining(result.remaining_sec);
        messagesRef.current = [
          ...messagesRef.current,
          { role: "assistant", content: result.reply },
        ];
        setExpression(result.expression as AvatarExpression);
        await playCounselor(result.reply, result.audio_base64, result.audio_mime);
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err instanceof ApiClientError ? err.message : "Counselor unavailable");
        setListenActive(true);
      } finally {
        if (turnAbortRef.current === ac) turnAbortRef.current = null;
        if (!ac.signal.aborted) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [avatarId, id, locale, playCounselor, summary],
  );

  const handleAudio = useCallback(
    async (blob: Blob) => {
      if (!id || busyRef.current || summary) return;
      turnAbortRef.current?.abort();
      const ac = new AbortController();
      turnAbortRef.current = ac;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setListenActive(false);
      setCaption("");
      try {
        const result = await api.sessionVoice(id, blob, {
          avatarId,
          locale,
        });
        if (ac.signal.aborted) return;
        // Silence / no words — stay on Listening, never show "Could not transcribe".
        if (result.empty || !result.transcript?.trim() || !result.reply?.trim()) {
          setCaption("");
          setListenActive(true);
          return;
        }
        if (typeof result.remaining_sec === "number") {
          setRemaining(result.remaining_sec);
        }
        messagesRef.current = [
          ...messagesRef.current,
          { role: "user", content: result.transcript },
          { role: "assistant", content: result.reply },
        ];
        setCaption(`You: ${result.transcript}`);
        setExpression(result.expression as AvatarExpression);
        void playCounselor(result.reply, result.audio_base64, result.audio_mime);
      } catch (err) {
        if (ac.signal.aborted) return;
        const msg = err instanceof ApiClientError ? err.message : "Counselor unavailable";
        // Treat empty-audio / soft STT failures as keep-listening, not a red error.
        if (
          /transcrib|no speech|empty|could not understand/i.test(msg) ||
          (err instanceof ApiClientError && err.status === 400)
        ) {
          setCaption("");
          setListenActive(true);
          return;
        }
        setError(msg);
        setListenActive(true);
      } finally {
        if (turnAbortRef.current === ac) turnAbortRef.current = null;
        if (!ac.signal.aborted) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [avatarId, id, locale, playCounselor, summary],
  );

  const canUseServerVoice = serverVoice && !summary && !starting;
  const canUseBrowserSpeech = !serverVoice && listenActive && !summary && !starting;

  const serverLoop = useServerVoiceLoop({
    active: canUseServerVoice,
    enabled: serverVoice,
    onAudio: handleAudio,
    onInterrupt: interruptSpeaking,
    speakingRef,
  });

  const speech = useFreeSpeechLoop({
    active: canUseBrowserSpeech,
    locale,
    onUtterance: handleUtterance,
  });

  const userSpeaking = serverVoice ? serverLoop.userSpeaking : speech.userSpeaking;

  useEffect(() => {
    const next = presenceToExpression(presence, userSpeaking);
    if (!speaking) setExpression(next);
  }, [presence, userSpeaking, speaking]);

  useEffect(() => {
    void api
      .health()
      .then((h) => {
        setServerVoice(h.whisper === "ready");
      })
      .catch(() => {
        setServerVoice(false);
      });
  }, []);

  useEffect(() => {
    if (!id) return;
    const bootGen = ++bootGenRef.current;
    void (async () => {
      try {
        // Trust the companion shown in the UI (localStorage). Never let a stale
        // DB value (e.g. hop/Milo) overwrite Coco and force a male voice.
        const localAvatar = asAvatarId(getAvatarId());
        const localLocale = getLocale();
        setAvatarState(localAvatar);
        setLocaleState(localLocale);
        setAvatarId(localAvatar);
        const started = await api.startSession(id, {
          avatarId: localAvatar,
          locale: localLocale,
        });
        // Only the latest boot may speak — kills Strict Mode / double-effect overlap.
        if (bootGen !== bootGenRef.current) return;
        setRemaining(started.duration_target_sec);
        messagesRef.current = [
          { role: "assistant", content: started.opening_message },
        ];
        setStarting(false);
        // One spoken intro per tab session. Do NOT key off already_active alone —
        // Strict Mode's second /start is already_active and used to skip TTS,
        // which killed the Calmi-style avatar intro.
        const playedKey = `empathic.opening_played.${id}`;
        let alreadyPlayed = false;
        try {
          alreadyPlayed = sessionStorage.getItem(playedKey) === "1";
        } catch {
          alreadyPlayed = false;
        }
        if (alreadyPlayed) {
          setListenActive(true);
          return;
        }
        await playCounselorRef.current(
          started.opening_message,
          started.audio_base64,
          started.audio_mime,
        );
        if (bootGen !== bootGenRef.current) return;
        try {
          sessionStorage.setItem(playedKey, "1");
        } catch {
          /* ignore quota / private mode */
        }
      } catch (err) {
        if (bootGen === bootGenRef.current) {
          setError(err instanceof ApiClientError ? err.message : "Could not start");
          setStarting(false);
        }
      }
    })();
    return () => {
      bootGenRef.current += 1;
      stopVoice();
    };
  }, [id, stopVoice]);

  useEffect(() => {
    if (starting) return;
    setGreeting(true);
    const t = window.setTimeout(() => setGreeting(false), 2600);
    return () => window.clearTimeout(t);
  }, [starting]);

  useEffect(() => {
    if (summary) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [summary]);

  async function endCall() {
    if (!id || summary || endingRef.current) return;
    endingRef.current = true;
    setListenActive(false);
    stopVoice();
    setEnding(true);
    try {
      const closed = await api.closeSession(id, 3);
      setSummary({ summary: closed.summary, homework: closed.homework });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not end session");
      endingRef.current = false;
      setEnding(false);
    }
  }

  const preset = getAvatar(avatarId);
  const isListening = userSpeaking || (listenActive && !speaking);

  if (starting) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-[#1C1815] text-cream">
        <div className="flex flex-col items-center gap-5 px-6">
          <AsciiBloom label="Getting your space ready." size="lg" tone="cream" />
        </div>
      </div>
    );
  }

  const voiceHint = busy
    ? "Thinking…"
    : speaking
      ? `${preset.name} is speaking`
      : isListening
        ? userSpeaking
          ? "Listening…"
          : "I'm here, go ahead"
        : "One moment…";

  const statusColor = busy
    ? "#c99a3f"
    : speaking
      ? preset.accent
      : isListening
        ? "#5c7a5e"
        : "#8a8071";

  if (summary) {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-cream text-ink pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full min-h-0 max-w-xl flex-1 flex-col items-center overflow-y-auto overscroll-contain px-4 py-8 text-center sm:max-w-2xl sm:px-6 sm:py-12 lg:max-w-3xl lg:px-8 lg:py-16">
          <div className="mb-5 flex gap-2 sm:mb-7">
            <Diamond size={8} />
            <Diamond size={8} color="var(--color-forest)" />
            <Diamond size={8} color="var(--color-dusk)" />
          </div>
          <h2 className="max-w-[34rem] font-display text-[1.6rem] leading-[1.2] font-normal sm:text-[2.15rem] lg:text-[2.4rem]">
            You&apos;ve had a{" "}
            <span className="font-script text-rose italic">gentle</span> session.
          </h2>
          <p className="mt-4 max-w-[28rem] text-[14px] leading-[1.65] text-ink/65 sm:mt-5 sm:text-[15px] lg:max-w-[32rem]">
            {summary.summary}
          </p>
          <p className="mt-4 max-w-[28rem] text-[14px] leading-[1.65] text-ink/80 sm:text-[15px] lg:max-w-[32rem]">
            <span className="font-mono text-[11px] tracking-[0.06em] text-rose uppercase sm:text-[12px]">
              A small step to try
            </span>
            <br />
            {summary.homework}
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 pb-4 sm:mt-10 sm:max-w-lg sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <button
              type="button"
              onClick={() => navigate("/book")}
              className="border border-forest bg-forest px-5 py-3.5 font-mono text-[12px] tracking-[0.05em] text-cream uppercase transition hover:opacity-90 sm:px-6 sm:text-[13px]"
            >
              Book next session
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="border border-line px-5 py-3.5 font-mono text-[12px] tracking-[0.05em] text-ink uppercase transition hover:border-ink/40 sm:px-6 sm:text-[13px]"
            >
              Exit to home
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="py-2 text-[14px] text-ink/60 underline underline-offset-4 transition hover:text-ink"
            >
              Your sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const captionText = caption || (isListening ? "I'm listening, take your time." : "...");

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#0f0f0f] text-cream pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {needsAudioTap && (
        <button
          type="button"
          onClick={() => void resumePendingAudio()}
          className="absolute inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-[2px]"
        >
          <span className="max-w-xs border border-cream/25 bg-[#2b2622] px-5 py-4 text-center font-display text-[clamp(15px,2.5vw,18px)] leading-snug text-cream">
            Tap to hear {preset.name}
          </span>
        </button>
      )}

      <header className="flex shrink-0 items-center justify-between gap-3 px-[clamp(0.75rem,2.5vw,1.75rem)] py-[clamp(0.55rem,1.4vw,1rem)]">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
          />
          <p className="truncate font-mono text-[clamp(11px,1.8vw,13px)] tracking-[0.04em] text-cream/85">
            {preset.name}
          </p>
          <span className="hidden font-mono text-[11px] tracking-[0.05em] text-cream/45 uppercase sm:inline">
            AI companion
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden font-mono text-[11px] tracking-[0.14em] text-cream/40 uppercase sm:inline">
            Session
          </span>
          <SessionTimer remainingSec={remaining} />
        </div>
      </header>

      <div className="relative mx-[clamp(0.5rem,2vw,1.5rem)] mb-1 flex min-h-0 flex-1 items-stretch justify-center lg:items-center">
        <div
          className="relative h-full w-full min-h-0 overflow-hidden rounded-[clamp(1rem,2.5vw,1.75rem)] border border-white/10 lg:aspect-[16/10] lg:h-full lg:max-h-full lg:w-auto lg:max-w-full"
          style={{ background: preset.stageBg }}
        >
          <LiveCatAvatar
            avatarId={avatarId}
            expression={expression}
            speaking={speaking}
            listening={isListening}
            greeting={greeting}
            variant="fill"
            fit="contain"
          />

          <p className="pointer-events-none absolute bottom-[clamp(0.65rem,1.8vw,1rem)] left-[clamp(0.65rem,1.8vw,1rem)] z-10 max-w-[48%] truncate font-sans text-[clamp(10px,1.6vw,12px)] font-medium tracking-[0.04em] text-cream uppercase drop-shadow">
            {preset.name}
          </p>

          <div className="pointer-events-none absolute inset-x-0 bottom-[clamp(2.4rem,8vw,3.25rem)] z-10 px-[clamp(0.65rem,1.8vw,1.25rem)] pr-[clamp(5rem,22vw,8.5rem)]">
            {busy ? (
              <AsciiBloom label="Let me gather my thoughts." tone="cream" />
            ) : (
              showCaptions && (
                <p className="max-w-[min(36rem,100%)] break-words text-left font-display text-[clamp(13px,2.2vw,17px)] leading-[1.4] font-light text-cream drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  {captionText}
                </p>
              )
            )}
          </div>

          <UserCameraPip
            videoRef={camera.videoRef}
            enabled={camera.enabled}
            onToggle={() => void camera.toggle()}
          />
        </div>
      </div>

      {(error || serverLoop.error || speech.error || camera.error) && (
        <p className="shrink-0 px-4 pt-1.5 text-center font-mono text-[clamp(10px,1.6vw,12px)] text-rose">
          {error || serverLoop.error || speech.error || camera.error}
        </p>
      )}

      <div className="flex shrink-0 flex-col items-center gap-[clamp(0.4rem,1.2vw,0.85rem)] px-[clamp(0.75rem,2.5vw,2rem)] py-[clamp(0.55rem,1.5vw,1.15rem)]">
        <p className="font-mono text-[clamp(10px,1.5vw,11px)] tracking-[0.06em] text-cream/50 uppercase">
          {voiceHint}
        </p>

        {/* Done/Stop are primary; VAD silence is backup only. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(speaking || busy) && (
            <button
              type="button"
              onClick={stopAi}
              className="rounded-full border border-cream/25 bg-[#3a2220] px-5 py-2.5 font-mono text-[clamp(11px,1.6vw,12px)] tracking-[0.06em] text-cream uppercase transition hover:border-rose/50 hover:bg-rose/20"
            >
              Stop
            </button>
          )}
          {!speaking && !busy && !summary && !starting && listenActive && (
            <button
              type="button"
              onClick={() => {
                if (serverVoice) {
                  if (serverLoop.phase === "user_speaking") {
                    serverLoop.finishTurn();
                  } else {
                    setCaption("I'm listening — speak, then tap I'm done.");
                  }
                  return;
                }
                if (speech.partial) speech.forceEndTurn();
                else setCaption("I'm listening — speak, then tap I'm done.");
              }}
              className="rounded-full border border-cream/25 bg-[#2b2622] px-5 py-2.5 font-mono text-[clamp(11px,1.6vw,12px)] tracking-[0.06em] text-cream uppercase transition hover:border-cream/45"
            >
              I&apos;m done
            </button>
          )}
        </div>

        {!busy && !speaking && (
          <MoodChips
            selected={mood}
            onPick={(label) => {
              setMood(label);
              void handleUtterance(`Right now I'm feeling ${label.toLowerCase()}.`);
            }}
          />
        )}

        <div className="flex flex-wrap items-center justify-center gap-[clamp(0.55rem,1.5vw,1rem)]">
          <RoundControl
            label={showCaptions ? "Hide captions" : "Show captions"}
            active={showCaptions}
            onClick={() => setShowCaptions((v) => !v)}
          >
            <CaptionIcon />
          </RoundControl>
          <RoundControl
            label={showType ? "Hide keyboard" : "Type instead"}
            active={showType}
            onClick={() => setShowType((v) => !v)}
          >
            <KeyboardIcon />
          </RoundControl>
          <button
            type="button"
            onClick={() => void endCall()}
            aria-label="End session"
            className="grid h-[clamp(2.75rem,6vw,3rem)] min-w-[clamp(6.5rem,18vw,7.75rem)] place-items-center rounded-full bg-rose px-5 font-mono text-[clamp(11px,1.7vw,13px)] tracking-[0.05em] text-cream uppercase transition hover:bg-rose-deep active:scale-[0.98]"
          >
            {ending ? "Ending…" : "End session"}
          </button>
        </div>

        {showType && (
          <form
            className="flex w-full max-w-lg gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              const text = draft.trim();
              setDraft("");
              void handleUtterance(text);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 border border-cream/20 bg-[#2b2622] px-3 py-2.5 text-[15px] text-cream outline-none placeholder:text-cream/40 focus:border-dusk sm:px-4 sm:py-3"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="shrink-0 bg-rose px-3 py-2.5 font-mono text-[11px] tracking-[0.05em] text-cream uppercase transition hover:bg-rose-deep sm:px-5 sm:py-3 sm:text-[12px]"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const MOODS = ["Calm", "Heavy", "Hopeful", "Stuck"];

function MoodChips({
  selected,
  onPick,
}: {
  selected: string | null;
  onPick: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {MOODS.map((label) => {
        const active = selected === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            className={`border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.05em] uppercase transition active:scale-95 sm:px-3.5 sm:text-[11px] ${
              active
                ? "border-rose text-rose"
                : "border-cream/20 text-cream/70 hover:border-cream/40"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RoundControl({
  children,
  label,
  active,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-[clamp(2.75rem,6vw,3.15rem)] w-[clamp(2.75rem,6vw,3.15rem)] place-items-center rounded-full border transition ${
        active
          ? "border-dusk bg-dusk text-cream"
          : "border-cream/15 bg-[#332C27] text-cream hover:border-cream/35"
      }`}
    >
      {children}
    </button>
  );
}

function CaptionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 11.5h3M7 14.5h5M14 11.5h3M14.5 14.5H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 9.5h.01M9 9.5h.01M12 9.5h.01M15 9.5h.01M18 9.5h.01M8 14h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

