import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiClientError } from "../api/client";
import { AvatarStage } from "../components/AvatarStage";
import { SessionTimer } from "../components/SessionTimer";
import { UserCameraPip } from "../components/UserCameraPip";
import { VoiceControls } from "../components/VoiceControls";
import { useUserCamera } from "../hooks/useUserCamera";
import {
  playBase64Audio,
  speakWithBrowserTts,
  transcribeWithBrowserSpeech,
} from "../lib/audio";
import type { ChatMessage } from "../types";

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const camera = useUserCamera();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remaining, setRemaining] = useState(2700);
  const [expression, setExpression] = useState("calm");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(true);
  const [crisis, setCrisis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ summary: string; homework: string } | null>(
    null,
  );
  const [showTranscript, setShowTranscript] = useState(true);
  const [serverVoiceReady, setServerVoiceReady] = useState(false);

  useEffect(() => {
    void api
      .health()
      .then((h) => setServerVoiceReady(h.whisper === "ready"))
      .catch(() => setServerVoiceReady(false));
  }, []);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const started = await api.startSession(id);
        setMessages([{ role: "assistant", content: started.opening_message }]);
        setRemaining(started.duration_target_sec);
        setSpeaking(true);
        speakWithBrowserTts(started.opening_message, () => setSpeaking(false));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Could not start session");
      } finally {
        setStarting(false);
      }
    })();

    return () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
  }, [id]);

  useEffect(() => {
    if (crisis || summary) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [crisis, summary]);

  function stopPlayback() {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  async function playReply(reply: string, audioBase64?: string | null, mime?: string) {
    stopPlayback();
    setSpeaking(true);
    if (audioBase64) {
      try {
        audioRef.current = await playBase64Audio(audioBase64, mime ?? "audio/wav", () =>
          setSpeaking(false),
        );
        return;
      } catch {
        // fall through to browser TTS
      }
    }
    speakWithBrowserTts(reply, () => setSpeaking(false));
  }

  async function applyAssistantTurn(
    next: ChatMessage[],
    result: {
      reply: string;
      crisis: boolean;
      expression: string;
      remaining_sec: number;
      audio_base64?: string | null;
      audio_mime?: string;
    },
  ) {
    setExpression(result.expression);
    setRemaining(result.remaining_sec);
    setMessages([...next, { role: "assistant", content: result.reply }]);
    if (result.crisis) {
      setCrisis(true);
      stopPlayback();
      navigate("/crisis");
      return;
    }
    await playReply(result.reply, result.audio_base64, result.audio_mime);
  }

  async function send(content: string) {
    if (!id || crisis || summary) return;
    stopPlayback();
    setLoading(true);
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    try {
      const result = await api.sessionChat(id, content);
      await applyAssistantTurn(next, result);
    } catch (err) {
      setMessages(messages);
      setError(err instanceof ApiClientError ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendAudio(blob: Blob) {
    if (!id || crisis || summary) return;
    stopPlayback();
    setLoading(true);
    setError(null);

    try {
      const result = await api.sessionVoice(id, blob);
      const next = [...messages, { role: "user" as const, content: result.transcript }];
      setMessages(next);
      await applyAssistantTurn(next, result);
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : "Voice turn failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function browserListenTurn() {
    if (!id || crisis || summary) return;
    stopPlayback();
    setListening(true);
    setError(null);
    try {
      const transcript = await transcribeWithBrowserSpeech();
      setListening(false);
      await send(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hear you");
      setListening(false);
    }
  }

  async function endSession() {
    if (!id) return;
    stopPlayback();
    setLoading(true);
    try {
      const closed = await api.closeSession(id, 3);
      setSummary({ summary: closed.summary, homework: closed.homework });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not close session");
    } finally {
      setLoading(false);
    }
  }

  if (starting) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-sm text-white/70">
        Connecting to your session…
      </div>
    );
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex min-h-screen flex-col bg-[#14201f] text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-[#9dccc5] uppercase">
            Empathic Companion
          </p>
          <p className="text-xs text-white/55">
            Scheduled AI session · not diagnosis or prescriptions
          </p>
        </div>
        <SessionTimer remainingSec={remaining} />
      </header>

      {/* Call stage — full-bleed therapist + PiP self-view */}
      <div className="relative mx-4 min-h-[58vh] flex-1 overflow-hidden rounded-[28px] bg-gradient-to-b from-[#1d3330] to-[#0f1716] sm:mx-6">
        <div className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 20%, rgba(47,111,104,0.55), transparent 55%)",
          }}
        />
        <div className="relative z-10 flex h-full min-h-[58vh] flex-col items-center justify-center px-4 py-8">
          <p className="mb-4 text-sm font-medium text-white/70">Counselor</p>
          <AvatarStage
            fill
            expression={expression}
            speaking={speaking}
            listening={listening || loading}
          />
          {lastAssistant && (
            <p className="mt-6 max-w-lg text-center text-sm leading-relaxed text-white/85">
              {lastAssistant.content}
            </p>
          )}
        </div>

        <UserCameraPip
          videoRef={camera.videoRef}
          enabled={camera.enabled}
          onToggle={() => void camera.toggle()}
        />
      </div>

      {camera.error && (
        <p className="px-4 pt-2 text-xs text-[#f0b4ae] sm:px-6">{camera.error}</p>
      )}
      {error && <p className="px-4 pt-2 text-xs text-[#f0b4ae] sm:px-6">{error}</p>}

      {summary ? (
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white sm:m-6">
          <h2 className="font-display text-xl font-semibold">Session closed</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{summary.summary}</p>
          <p className="mt-3 text-sm">
            <span className="font-semibold">Homework:</span> {summary.homework}
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
        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="text-xs font-medium text-white/60 underline"
            >
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>
            <button
              type="button"
              onClick={() => void endSession()}
              className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90"
            >
              End session
            </button>
          </div>

          {showTranscript && (
            <div className="max-h-28 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/75">
              {messages.slice(-6).map((message, index) => (
                <p key={`${message.role}-${index}`} className="mb-1">
                  <span className="font-semibold text-[#9dccc5]">
                    {message.role === "user" ? "You" : "Counselor"}:
                  </span>{" "}
                  {message.content}
                </p>
              ))}
            </div>
          )}

          <VoiceControls
            disabled={loading || crisis || speaking}
            serverVoiceReady={serverVoiceReady}
            onSendText={send}
            onSendAudio={sendAudio}
            onBrowserListen={browserListenTurn}
          />
        </div>
      )}
    </div>
  );
}
