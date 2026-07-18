import { useEffect, useRef, useState } from "react";

import { float32ToWavBlob } from "../../lib/wav";

type Phase = "idle" | "listening" | "user_speaking" | "processing";

interface UseVadVoiceLoopArgs {
  active: boolean;
  enabled: boolean;
  onAudio: (blob: Blob) => Promise<void>;
  onInitFailed?: (message: string) => void;
}

const ORT_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const VAD_ASSET_CDN =
  "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";

/**
 * Silero VAD — dynamically imported so onnxruntime never crashes the landing page.
 */
export function useVadVoiceLoop({
  active,
  enabled,
  onAudio,
  onInitFailed,
}: UseVadVoiceLoopArgs) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const onAudioRef = useRef(onAudio);
  onAudioRef.current = onAudio;
  const onInitFailedRef = useRef(onInitFailed);
  onInitFailedRef.current = onInitFailed;
  const processingRef = useRef(false);

  useEffect(() => {
    if (!active || !enabled) {
      setPhase("idle");
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vad: any = null;

    async function boot() {
      setError(null);
      try {
        const { MicVAD } = await import("@ricky0123/vad-web");
        if (cancelled) return;

        vad = await MicVAD.new({
          baseAssetPath: VAD_ASSET_CDN,
          onnxWASMBasePath: ORT_WASM_CDN,
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
        const message =
          err instanceof Error
            ? err.message
            : "Could not start voice detection. Allow mic, or use Type instead.";
        if (!cancelled) {
          setError(message);
          setPhase("idle");
          onInitFailedRef.current?.(message);
        }
      }
    }

    async function handleSpeechEnd(audio: Float32Array) {
      if (processingRef.current || cancelled) return;
      if (audio.length < 1600) {
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
