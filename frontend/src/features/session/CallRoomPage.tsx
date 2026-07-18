import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import { AsciiBloom } from "../../components/AsciiBloom";
import { Diamond } from "../../components/Diamond";
import { SessionTimer } from "../../components/SessionTimer";
import { UserCameraPip } from "../../components/UserCameraPip";
import { useUserCamera } from "../../hooks/useUserCamera";
import { getAvatarId, getLocale, setAvatarId, setLocale } from "../../lib/storage";
import {
  playBase64Audio,
  speakWithBrowserTts,
  unlockAudioPlayback,
} from "../../lib/audio";
import { useAudioAmplitude } from "../../hooks/useAudioAmplitude";
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
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const amplitude = useAudioAmplitude(audioEl);
  const speakingRef = useRef(false);
  const finishSpeakingRef = useRef<(() => void) | null>(null);

  const stopVoice = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    setAudioEl(null);
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const interruptSpeaking = useCallback(() => {
    if (!speakingRef.current) return;
    stopVoice();
    setCaption("");
    finishSpeakingRef.current?.();
  }, [stopVoice]);

  const playCounselor = useCallback(
    async (text: string, audioBase64?: string | null, audioMime = "audio/wav") => {
      setListenActive(false);
      setSpeaking(true);
      speakingRef.current = true;
      setCaption(text);
      // Safety net only — real end is audio.onended. Short estimates were cutting TTS mid-sentence.
      const safetyMs = Math.min(180000, Math.max(20000, text.split(/\s+/).length * 700));

      await new Promise<void>((resolve) => {
        let done = false;
        let safetyTimer = 0;
        const finish = () => {
          if (done) return;
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
          // Explicit interrupt (barge-in / stop) always wins.
          if (done) return;
          done = true;
          if (safetyTimer) window.clearTimeout(safetyTimer);
          finishSpeakingRef.current = null;
          pendingAudioRef.current = null;
          setNeedsAudioTap(false);
          resolve();
        };
        safetyTimer = window.setTimeout(finish, safetyMs);

        const startBrowser = () => {
          setAudioEl(null);
          speakWithBrowserTts(text, finish, { avatarId, locale });
        };

        if (audioBase64) {
          void playBase64Audio(audioBase64, audioMime, finish)
            .then((el) => {
              audioElRef.current = el;
              setAudioEl(el);
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
              const name = err instanceof DOMException ? err.name : "";
              if (name === "NotAllowedError") {
                pendingAudioRef.current = { text, audioBase64, audioMime, finish };
                setNeedsAudioTap(true);
                return;
              }
              startBrowser();
            });
        } else {
          startBrowser();
        }
      });

      audioElRef.current = null;
      setAudioEl(null);
      speakingRef.current = false;
      setSpeaking(false);
      setListenActive(true);
    },
    [avatarId, locale],
  );

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
        setAudioEl(el);
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
        setRemaining(result.remaining_sec);
        messagesRef.current = [
          ...messagesRef.current,
          { role: "assistant", content: result.reply },
        ];
        setExpression(result.expression as AvatarExpression);
        await playCounselor(result.reply, result.audio_base64, result.audio_mime);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Counselor unavailable");
        setListenActive(true);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [avatarId, id, locale, playCounselor, summary],
  );

  const handleAudio = useCallback(
    async (blob: Blob) => {
      if (!id || busyRef.current || summary) return;
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
        busyRef.current = false;
        setBusy(false);
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
    let cancelled = false;
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
        if (cancelled) return;
        setRemaining(started.duration_target_sec);
        messagesRef.current = [
          { role: "assistant", content: started.opening_message },
        ];
        setStarting(false);
        await playCounselor(
          started.opening_message,
          started.audio_base64,
          started.audio_mime,
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Could not start");
          setStarting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      stopVoice();
    };
  }, [id, playCounselor, stopVoice]);

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
    if (!id) return;
    setListenActive(false);
    stopVoice();
    setBusy(true);
    busyRef.current = true;
    try {
      const closed = await api.closeSession(id, 3);
      setSummary({ summary: closed.summary, homework: closed.homework });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not end session");
    } finally {
      busyRef.current = false;
      setBusy(false);
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

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#1C1815] text-cream pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {needsAudioTap && (
        <button
          type="button"
          onClick={() => void resumePendingAudio()}
          className="absolute inset-0 z-50 grid place-items-center bg-[#1C1815]/72 px-6 backdrop-blur-[2px]"
        >
          <span className="max-w-xs border border-cream/25 bg-[#2b2622] px-6 py-5 text-center font-display text-[18px] leading-snug text-cream">
            Tap to hear {preset.name}
          </span>
        </button>
      )}

      <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span
            className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
          />
          <p className="truncate font-mono text-[12px] tracking-[0.04em] text-cream/85">
            {preset.name}
          </p>
          <span className="hidden font-mono text-[11px] tracking-[0.05em] text-dusk uppercase sm:inline">
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

      <div className="relative mx-2 min-h-0 flex-1 overflow-hidden rounded-[8px] border border-cream/12 sm:mx-5 md:mx-6">
        <LiveCatAvatar
          avatarId={avatarId}
          expression={expression}
          amplitude={amplitude}
          speaking={speaking}
          listening={isListening}
          greeting={greeting}
          variant="fill"
        />
        <FlourishCorners />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-t from-[#1C1815]/95 via-[#1C1815]/45 to-transparent px-3 pt-16 pb-4 sm:px-4 sm:pt-20 sm:pb-6">
          {busy ? (
            <AsciiBloom label="Let me gather my thoughts." tone="cream" />
          ) : (
            showCaptions && (
              <p className="max-w-lg text-center font-display text-[15px] leading-[1.45] font-light text-cream/92 sm:text-[18px] sm:leading-[1.5]">
                {caption || (isListening ? "I'm listening, take your time." : "...")}
              </p>
            )
          )}
        </div>

        <span className="absolute bottom-3 left-3 z-20 bg-ink/45 px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-cream backdrop-blur sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
          {preset.name}
        </span>

        <UserCameraPip
          videoRef={camera.videoRef}
          enabled={camera.enabled}
          onToggle={() => void camera.toggle()}
        />
      </div>

      {(error || serverLoop.error || speech.error || camera.error) && (
        <p className="shrink-0 px-3 pt-2 text-center font-mono text-[11px] text-rose sm:px-8 sm:text-[12px]">
          {error || serverLoop.error || speech.error || camera.error}
        </p>
      )}

      {summary ? (
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-cream px-5 py-10 text-center text-ink sm:px-6 sm:py-14">
          <div className="mb-6 flex gap-2 sm:mb-7">
            <Diamond size={8} />
            <Diamond size={8} color="var(--color-forest)" />
            <Diamond size={8} color="var(--color-dusk)" />
          </div>
          <h2 className="max-w-[520px] font-display text-[28px] leading-[1.2] font-normal sm:text-[38px]">
            You've had a <span className="font-script text-rose italic">gentle</span> session.
          </h2>
          <p className="mt-4 max-w-[440px] text-[14px] leading-[1.6] text-ink/65 sm:text-[15px]">
            {summary.summary}
          </p>
          <p className="mt-4 max-w-[440px] text-[14px] leading-[1.6] text-ink/80 sm:text-[15px]">
            <span className="font-mono text-[12px] tracking-[0.06em] text-rose uppercase">
              A small step to try
            </span>
            <br />
            {summary.homework}
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <button
              type="button"
              onClick={() => navigate("/book")}
              className="border border-forest bg-forest px-6 py-3.5 font-mono text-[13px] tracking-[0.05em] text-cream uppercase transition hover:opacity-90"
            >
              Book next session
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="border border-line px-6 py-3.5 font-mono text-[13px] tracking-[0.05em] text-ink uppercase transition hover:border-ink/40"
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
      ) : (
        <div className="flex shrink-0 flex-col items-center gap-3 px-3 py-3 sm:gap-4 sm:px-8 sm:py-5">
          <p className="font-mono text-[10px] tracking-[0.06em] text-cream/50 uppercase sm:text-[11px]">
            {voiceHint}
          </p>

          {!busy && (
            <MoodChips
              selected={mood}
              onPick={(label) => {
                setMood(label);
                void handleUtterance(`Right now I'm feeling ${label.toLowerCase()}.`);
              }}
            />
          )}

          {!serverVoice && listenActive && !busy && (
            <button
              type="button"
              disabled={!speech.partial}
              onClick={() => speech.forceEndTurn()}
              className="border border-cream/20 bg-[#2b2622] px-5 py-2 font-mono text-[11px] tracking-[0.05em] text-cream uppercase transition hover:border-cream/40 disabled:opacity-40 sm:px-6 sm:py-2.5 sm:text-[12px]"
            >
              Send what I said
            </button>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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
              disabled={busy}
              onClick={() => void endCall()}
              aria-label="End session"
              className="grid h-12 min-w-[7.5rem] place-items-center rounded-full bg-rose px-5 py-3 font-mono text-[12px] tracking-[0.05em] text-cream uppercase transition hover:bg-rose-deep disabled:opacity-50 sm:min-w-0 sm:px-7 sm:text-[13px]"
            >
              End session
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
                className="shrink-0 bg-rose px-4 py-2.5 font-mono text-[12px] tracking-[0.05em] text-cream uppercase transition hover:bg-rose-deep sm:px-5 sm:py-3"
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}
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
            className={`border px-3.5 py-1.5 font-mono text-[11px] tracking-[0.05em] uppercase transition active:scale-95 ${
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

function FlourishCorners() {
  const corners = [
    "left-3 top-3",
    "right-3 top-3 -scale-x-100",
    "left-3 bottom-3 -scale-y-100",
    "right-3 bottom-3 -scale-100",
  ];
  return (
    <>
      {corners.map((pos) => (
        <svg
          key={pos}
          className={`pointer-events-none absolute z-20 ${pos} h-7 w-7 text-rose`}
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 12 V2 H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
      ))}
    </>
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
      className={`grid h-12 w-12 place-items-center rounded-full border transition ${
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

