import { useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";

import { float32ToWavBlob } from "../../lib/wav";

type Phase = "idle" | "listening" | "user_speaking" | "processing";

interface UseVadVoiceLoopArgs {
  active: boolean;
  /** Prefer server Whisper path when true. */
  enabled: boolean;
  onAudio: (blob: Blob) => Promise<void>;
}

/**
 * Silero VAD (client ONNX) → onSpeechEnd → WAV blob → server Whisper/Piper.
 * Real endpointing: fires when the user actually stops talking.
 */
export function useVadVoiceLoop({ active, enabled, onAudio }: UseVadVoiceLoopArgs) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const onAudioRef = useRef(onAudio);
  onAudioRef.current = onAudio;
  const processingRef = useRef(false);

  useEffect(() => {
    if (!active || !enabled) {
      setPhase("idle");
      return;
    }

    let cancelled = false;
    let vad: Awaited<ReturnType<typeof MicVAD.new>> | null = null;

    async function boot() {
      setError(null);
      try {
        vad = await MicVAD.new({
          // CDN defaults for worklet/onnx/wasm — works with Vite without copy plugin.
          onSpeechStart: () => {
            if (!cancelled && !processingRef.current) setPhase("user_speaking");
          },
          onSpeechEnd: (audio: Float32Array) => {
            if (cancelled || processingRef.current) return;
            void handleSpeechEnd(audio);
          },
          onVADMisfire: () => {
            if (!cancelled && !processingRef.current) setPhase("listening");
          },
          minSpeechMs: 400,
          redemptionMs: 800,
          positiveSpeechThreshold: 0.6,
          negativeSpeechThreshold: 0.35,
        });
        if (cancelled) {
          vad.destroy();
          return;
        }
        vad.start();
        setPhase("listening");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not start voice detection. Allow mic, or use Type instead.",
          );
          setPhase("idle");
        }
      }
    }

    async function handleSpeechEnd(audio: Float32Array) {
      if (processingRef.current || cancelled) return;
      if (audio.length < 1600) {
        // < ~100ms — ignore
        setPhase("listening");
        return;
      }

      processingRef.current = true;
      setPhase("processing");
      try {
        vad?.pause();
      } catch {
        // ignore
      }

      const blob = float32ToWavBlob(audio, 16000);
      try {
        await onAudioRef.current(blob);
      } catch {
        if (!cancelled) {
          setError("Could not reach counselor voice API. I'll keep listening.");
        }
      }

      processingRef.current = false;
      if (!cancelled) {
        try {
          vad?.start();
          setPhase("listening");
        } catch {
          setPhase("idle");
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      processingRef.current = false;
      try {
        vad?.destroy();
      } catch {
        // ignore
      }
      setPhase("idle");
    };
  }, [active, enabled]);

  return {
    phase,
    error,
    userSpeaking: phase === "user_speaking",
    listening: phase === "listening" || phase === "user_speaking",
  };
}
