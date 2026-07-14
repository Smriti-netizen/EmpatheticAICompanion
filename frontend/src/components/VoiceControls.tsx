import { useRef, useState, type FormEvent, type PointerEvent } from "react";

import { MicRecorder } from "../lib/audio";

interface VoiceControlsProps {
  disabled?: boolean;
  /** When false, hold-to-talk uses browser speech (no server Whisper). */
  serverVoiceReady?: boolean;
  onSendText: (content: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  onBrowserListen?: () => Promise<void>;
}

export function VoiceControls({
  disabled,
  serverVoiceReady = false,
  onSendText,
  onSendAudio,
  onBrowserListen,
}: VoiceControlsProps) {
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MicRecorder | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || disabled) return;
    const next = value;
    setValue("");
    await onSendText(next);
  }

  async function startRecording(event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    setMicError(null);

    if (!serverVoiceReady) {
      if (!onBrowserListen) return;
      setRecording(true);
      try {
        await onBrowserListen();
      } catch (err) {
        setMicError(err instanceof Error ? err.message : "Mic failed");
      } finally {
        setRecording(false);
      }
      return;
    }

    if (!onSendAudio) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const recorder = new MicRecorder();
    recorderRef.current = recorder;
    try {
      await recorder.start();
      setRecording(true);
    } catch {
      setMicError("Microphone permission denied.");
      recorderRef.current = null;
    }
  }

  async function stopRecording() {
    if (!serverVoiceReady) return;
    if (!recorderRef.current || !recording) return;
    setRecording(false);
    try {
      const blob = await recorderRef.current.stop();
      recorderRef.current = null;
      if (blob.size > 0 && onSendAudio) {
        await onSendAudio(blob);
      }
    } catch {
      setMicError("Could not capture audio.");
      recorderRef.current?.cancel();
      recorderRef.current = null;
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled || recording}
          placeholder="Type a message, or use the mic…"
          className="flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || recording || !value.trim()}
          className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <button
        type="button"
        disabled={disabled}
        onPointerDown={(event) => void startRecording(event)}
        onPointerUp={() => void stopRecording()}
        onPointerCancel={() => {
          recorderRef.current?.cancel();
          recorderRef.current = null;
          setRecording(false);
        }}
        className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          recording
            ? "bg-crisis text-white"
            : "border border-white/20 bg-white/10 text-white hover:border-accent"
        } disabled:opacity-50`}
      >
        {recording
          ? serverVoiceReady
            ? "Release to send…"
            : "Listening… speak now"
          : serverVoiceReady
            ? "Hold to talk"
            : "Tap mic & speak"}
      </button>

      <p className="text-[11px] text-white/45">
        {serverVoiceReady
          ? "Server voice (Whisper + Piper/edge-tts) enabled."
          : "Browser mic fallback. Run scripts/setup_voice.ps1 for Whisper."}
      </p>

      {micError && <p className="text-xs text-[#f0b4ae]">{micError}</p>}
    </div>
  );
}
