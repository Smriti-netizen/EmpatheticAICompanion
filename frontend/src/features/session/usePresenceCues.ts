import { useCallback, useEffect, useRef, useState } from "react";

export type PresenceCue = "neutral" | "still" | "animated" | "low_engagement";

/**
 * Coarse, on-device visual cues only — never uploads frames.
 * Maps motion/brightness stability to avatar emotion hints.
 */
export function usePresenceCues(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [cue, setCue] = useState<PresenceCue>("neutral");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevRef = useRef<Uint8ClampedArray | null>(null);

  const sample = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const width = 64;
    const height = 48;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const prev = prevRef.current;
    prevRef.current = new Uint8ClampedArray(data);

    if (!prev) return;

    let diff = 0;
    for (let i = 0; i < data.length; i += 16) {
      diff += Math.abs(data[i] - prev[i]);
    }
    const motion = diff / (width * height);

    if (motion < 1.2) setCue("still");
    else if (motion > 8) setCue("animated");
    else if (motion < 2.5) setCue("low_engagement");
    else setCue("neutral");
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      setCue("neutral");
      return;
    }
    const id = window.setInterval(sample, 700);
    return () => window.clearInterval(id);
  }, [enabled, sample]);

  return cue;
}

export function presenceToExpression(
  cue: PresenceCue,
  userIsSpeaking: boolean,
): "calm" | "attentive" | "concerned" | "warm" | "listening" {
  if (userIsSpeaking) {
    if (cue === "still" || cue === "low_engagement") return "concerned";
    if (cue === "animated") return "attentive";
    return "listening";
  }
  if (cue === "still") return "concerned";
  if (cue === "animated") return "warm";
  return "calm";
}
