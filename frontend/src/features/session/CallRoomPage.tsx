import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import { SessionTimer } from "../../components/SessionTimer";
import { UserCameraPip } from "../../components/UserCameraPip";
import { useUserCamera } from "../../hooks/useUserCamera";
import { getAvatarId } from "../../lib/storage";
import { playBase64Audio, speakWithBrowserTts } from "../../lib/audio";
import type { AvatarExpression, AvatarId } from "../avatar/avatarCatalog";
import { CounselorAvatar } from "../avatar/CounselorAvatar";
import { presenceToExpression, usePresenceCues } from "./usePresenceCues";
import { useFreeSpeechLoop } from "./useFreeSpeechLoop";
import { useVadVoiceLoop } from "./useVadVoiceLoop";

/**
 * Video-call therapy room.
 * Primary path (P4): Silero VAD → Whisper STT → counselor → Piper/edge-tts.
 * Fallback: browser SpeechRecognition + speechSynthesis when Whisper is offline.
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
  const [draft, setDraft] = useState("");
  const [expression, setExpression] = useState<AvatarExpression>("calm");
  const [serverVoice, setServerVoice] = useState(false);
  const [ttsEngine, setTtsEngine] = useState("browser");

  const presence = usePresenceCues(camera.videoRef, camera.enabled && listenActive);
  const messagesRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const busyRef = useRef(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const stopVoice = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const playCounselor = useCallback(
    async (text: string, audioBase64?: string | null, audioMime = "audio/wav") => {
      setListenActive(false);
      setSpeaking(true);
      setCaption(text);
      const estMs = Math.min(60000, Math.max(2500, text.split(/\s+/).length * 380));

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          window.clearTimeout(fallback);
          resolve();
        };
        const fallback = window.setTimeout(finish, estMs);

        if (audioBase64) {
          void playBase64Audio(audioBase64, audioMime, finish)
            .then((el) => {
              audioElRef.current = el;
            })
            .catch(() => {
              speakWithBrowserTts(text, finish);
            });
        } else {
          speakWithBrowserTts(text, finish);
        }
      });

      audioElRef.current = null;
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
        if (result.crisis) {
          stopVoice();
          navigate("/crisis");
          return;
        }
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
        if (result.crisis) {
          stopVoice();
          navigate("/crisis");
          return;
        }
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

  const canUseServerVoice = serverVoice && listenActive && !summary && !starting;
  const canUseBrowserSpeech = !serverVoice && listenActive && !summary && !starting;

  const vad = useVadVoiceLoop({
    active: canUseServerVoice,
    enabled: serverVoice,
    onAudio: handleAudio,
  });

  const speech = useFreeSpeechLoop({
    active: canUseBrowserSpeech,
    onUtterance: handleUtterance,
  });

  const userSpeaking = serverVoice ? vad.userSpeaking : speech.userSpeaking;

  useEffect(() => {
    const next = presenceToExpression(presence, userSpeaking);
    if (!speaking) setExpression(next);
  }, [presence, userSpeaking, speaking]);

  useEffect(() => {
    void api
      .health()
      .then((h) => {
        setServerVoice(h.whisper === "ready");
        setTtsEngine(
          h.tts === "ready" ? (h.tts_engine || "server") : "browser",
        );
      })
      .catch(() => {
        setServerVoice(false);
        setTtsEngine("browser");
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

  if (starting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#101918] text-sm text-white/70">
        Connecting secure session…
      </div>
    );
  }

  const voiceHint = serverVoice
    ? busy
      ? "Counselor is responding…"
      : listenActive
        ? userSpeaking
          ? "Hearing you… pause when finished"
          : "Listening (Silero VAD + Whisper) — speak naturally"
        : "Please wait…"
    : busy
      ? "Counselor is responding…"
      : listenActive
        ? speech.partial
          ? "Got it — pause or tap Send"
          : "Browser speech fallback — speak, then pause"
        : "Please wait…";

  return (
    <div className="flex min-h-screen flex-col bg-[#101918] text-white">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs tracking-[0.16em] text-[#9dccc5] uppercase">Live session</p>
          <p className="text-xs text-white/50">
            AI support · voice: {serverVoice ? `Whisper + ${ttsEngine}` : "browser fallback"}
          </p>
        </div>
        <SessionTimer remainingSec={remaining} />
      </header>

      <div className="relative mx-3 min-h-[62vh] flex-1 overflow-hidden rounded-[28px] bg-gradient-to-b from-[#1a2e2b] to-[#0c1211] sm:mx-5">
        <div className="relative z-10 flex h-full min-h-[62vh] flex-col items-center justify-center px-4 py-6">
          <CounselorAvatar
            avatarId={avatarId}
            expression={expression}
            speaking={speaking}
            listening={userSpeaking || (listenActive && !speaking)}
          />
          <p className="mt-5 max-w-lg text-center text-sm leading-relaxed text-white/85">
            {caption ||
              (listenActive
                ? "I’m listening — take your time."
                : speaking
                  ? "…"
                  : "Session ready")}
          </p>
          {!serverVoice && speech.partial && listenActive && (
            <p className="mt-2 max-w-md text-center text-xs text-white/45">{speech.partial}</p>
          )}
        </div>

        <UserCameraPip
          videoRef={camera.videoRef}
          enabled={camera.enabled}
          onToggle={() => void camera.toggle()}
        />
      </div>

      {(error || vad.error || speech.error || camera.error) && (
        <p className="px-4 pt-2 text-xs text-[#f0b4ae] sm:px-6">
          {error || vad.error || speech.error || camera.error}
        </p>
      )}

      {summary ? (
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:m-6">
          <h2 className="font-display text-xl font-semibold">Session ended</h2>
          <p className="mt-2 text-sm text-white/80">{summary.summary}</p>
          <p className="mt-3 text-sm">
            <span className="font-semibold">Homework:</span> {summary.homework}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 py-5 sm:px-6">
          <p className="text-xs text-white/45">{voiceHint}</p>

          {!serverVoice && listenActive && !busy && (
            <button
              type="button"
              disabled={!speech.partial}
              onClick={() => speech.forceEndTurn()}
              className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
            >
              Send what I said
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void endCall()}
            className="rounded-full bg-[#b33b3b] px-10 py-3.5 text-sm font-semibold tracking-wide shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            End session
          </button>

          <button
            type="button"
            className="text-[11px] text-white/40 underline"
            onClick={() => setShowType((v) => !v)}
          >
            {showType ? "Hide keyboard" : "Type instead"}
          </button>

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
                className="flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm outline-none"
                placeholder="Type if speech isn’t available…"
              />
              <button
                type="submit"
                className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold"
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
