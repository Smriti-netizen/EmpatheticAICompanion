import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import { AsciiBloom } from "../../components/AsciiBloom";
import { SessionTimer } from "../../components/SessionTimer";
import { UserCameraPip } from "../../components/UserCameraPip";
import { useUserCamera } from "../../hooks/useUserCamera";
import { getAvatarId } from "../../lib/storage";
import { playBase64Audio, speakWithBrowserTts } from "../../lib/audio";
import { useAudioAmplitude } from "../../hooks/useAudioAmplitude";
import type { AvatarExpression, AvatarId } from "../avatar/avatarCatalog";
import { getAvatar } from "../avatar/avatarCatalog";
import { LiveCatAvatar } from "../avatar/LiveCatAvatar";
import { presenceToExpression, usePresenceCues } from "./usePresenceCues";
import { useFreeSpeechLoop } from "./useFreeSpeechLoop";
import { useServerVoiceLoop } from "./useServerVoiceLoop";

/**
 * Video-call therapy room.
 * Primary: mic + silence → faster-whisper → counselor → Piper/edge-tts.
 * Fallback only if Whisper is offline: browser SpeechRecognition.
 */
export function CallRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const camera = useUserCamera();
  const avatarId = (getAvatarId() as AvatarId) || "hop";

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

  /** Barge-in: user started talking → cut the avatar off and listen. */
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
      const estMs = Math.min(60000, Math.max(2500, text.split(/\s+/).length * 380));

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          window.clearTimeout(fallback);
          finishSpeakingRef.current = null;
          resolve();
        };
        finishSpeakingRef.current = finish;
        const fallback = window.setTimeout(finish, estMs);

        if (audioBase64) {
          void playBase64Audio(audioBase64, audioMime, finish)
            .then((el) => {
              audioElRef.current = el;
              setAudioEl(el);
            })
            .catch(() => {
              setAudioEl(null);
              speakWithBrowserTts(text, finish);
            });
        } else {
          setAudioEl(null);
          speakWithBrowserTts(text, finish);
        }
      });

      audioElRef.current = null;
      setAudioEl(null);
      speakingRef.current = false;
      setSpeaking(false);
      setListenActive(true);
    },
    [],
  );

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
        const result = await api.sessionChat(id, trimmed);
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
    [id, navigate, playCounselor, stopVoice, summary],
  );

  const handleAudio = useCallback(
    async (blob: Blob) => {
      if (!id || busyRef.current || summary) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setListenActive(false);
      setCaption("Transcribing…");
      try {
        const result = await api.sessionVoice(id, blob);
        setRemaining(result.remaining_sec);
        messagesRef.current = [
          ...messagesRef.current,
          { role: "user", content: result.transcript },
          { role: "assistant", content: result.reply },
        ];
        setCaption(`You: ${result.transcript}`);
        setExpression(result.expression as AvatarExpression);
        // Don't await TTS — keeps the mic loop free so the user can barge in.
        void playCounselor(result.reply, result.audio_base64, result.audio_mime);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Counselor unavailable");
        setListenActive(true);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [id, navigate, playCounselor, stopVoice, summary],
  );

  // Server voice keeps the mic open the whole session (enables barge-in).
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
        const started = await api.startSession(id);
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
      <div className="grid min-h-screen place-items-center bg-paper text-sm text-muted">
        <div className="flex flex-col items-center gap-5">
          <AsciiBloom label="Getting your space ready…" size="lg" />
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
          : "I'm here — go ahead"
        : "One moment…";

  const statusColor = busy
    ? "#c99a3f"
    : speaking
      ? preset.accent
      : isListening
        ? "#5c7a5e"
        : "#8a8071";

  return (
    <div
      className="flex min-h-screen flex-col text-ink"
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 12% -5%, #f6e1d6 0%, transparent 55%)," +
          "radial-gradient(ellipse 55% 40% at 100% 0%, #e6efe0 0%, transparent 50%)," +
          "#f7f2e9",
      }}
    >
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
          />
          <p className="text-sm font-semibold text-ink">{preset.name}</p>
          <span className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted ring-1 ring-line">
            AI companion
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.22em] text-muted uppercase">
            Session
          </span>
          <SessionTimer remainingSec={remaining} />
        </div>
      </header>

      {/* A held, contained moment — flourish-cornered card, never black */}
      <div className="relative mx-3 flex min-h-[60vh] flex-1 items-center justify-center overflow-hidden rounded-[32px] bg-surface/60 shadow-warm ring-1 ring-white/70 backdrop-blur-sm sm:mx-6">
        <FlourishCorners />
        <div className="flex flex-col items-center px-4 py-8">
          <LiveCatAvatar
            avatarId={avatarId}
            expression={expression}
            amplitude={amplitude}
            speaking={speaking}
            listening={isListening}
          />

          {busy ? (
            <div className="mt-7">
              <AsciiBloom label="Let me gather my thoughts…" />
            </div>
          ) : (
            showCaptions && (
              <p className="mt-7 max-w-lg text-center text-[15px] leading-relaxed text-ink/80">
                {caption ||
                  (isListening ? "I'm listening — take your time." : "…")}
              </p>
            )
          )}
        </div>

        {/* name chip like Meet tiles */}
        <span className="absolute bottom-4 left-4 rounded-lg bg-surface/80 px-3 py-1 text-xs font-medium text-ink ring-1 ring-line">
          {preset.name}
        </span>

        <UserCameraPip
          videoRef={camera.videoRef}
          enabled={camera.enabled}
          onToggle={() => void camera.toggle()}
        />
      </div>

      {(error || serverLoop.error || speech.error || camera.error) && (
        <p className="px-4 pt-3 text-center text-xs text-crisis sm:px-8">
          {error || serverLoop.error || speech.error || camera.error}
        </p>
      )}

      {summary ? (
        <div className="m-4 rounded-3xl border border-line bg-surface p-6 shadow-warm sm:m-6">
          <h2 className="font-display text-xl font-semibold text-ink">Session ended</h2>
          <p className="mt-2 text-sm text-muted">{summary.summary}</p>
          <p className="mt-3 text-sm text-ink">
            <span className="font-semibold">A small step to try:</span> {summary.homework}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-4 py-6 sm:px-8">
          <p className="text-xs font-medium text-muted">{voiceHint}</p>

          {!serverVoice && listenActive && !busy && (
            <button
              type="button"
              disabled={!speech.partial}
              onClick={() => speech.forceEndTurn()}
              className="rounded-full border border-line bg-white px-6 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-accent-soft disabled:opacity-40"
            >
              Send what I said
            </button>
          )}

          {/* Meet-style control bar */}
          <div className="flex items-center gap-4">
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
              className="grid h-14 w-20 place-items-center rounded-full bg-[#d15b52] text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
            >
              <HangupIcon />
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
                className="flex-1 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                placeholder="Type your message…"
              />
              <button
                type="submit"
                className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
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

// Delicate ornate brackets in each corner — "held / contained" framing.
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
          className={`pointer-events-none absolute ${pos} h-8 w-8 text-accent/30`}
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 20 Q2 2 20 2 M2 12 Q2 6 8 4 M12 2 Q6 2 4 8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="4" cy="4" r="1.4" fill="currentColor" />
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
      className={`grid h-14 w-14 place-items-center rounded-full ring-1 transition ${
        active
          ? "bg-accent text-white ring-accent"
          : "bg-white text-ink ring-line hover:bg-accent-soft"
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

function HangupIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 9c-1.6 0-3.15.25-4.6.7v3.1c0 .5-.3.95-.73 1.14-.86.4-1.65.9-2.36 1.5a1.1 1.1 0 0 1-1.5-.06L.68 14.3a1.1 1.1 0 0 1 0-1.56C3.7 9.9 7.63 8.2 12 8.2s8.3 1.7 11.32 4.54a1.1 1.1 0 0 1 0 1.56l-1.73 1.72a1.1 1.1 0 0 1-1.5.06c-.71-.6-1.5-1.1-2.36-1.5a1.27 1.27 0 0 1-.73-1.14v-3.1C15.15 9.25 13.6 9 12 9Z" transform="rotate(135 12 12)" />
    </svg>
  );
}
