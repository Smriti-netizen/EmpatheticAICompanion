import { useEffect, useRef, useState } from "react";

/**
 * Live RMS amplitude (0–1) of a playing HTMLAudioElement — drives mouth-open.
 * Pass state (not only a ref) so React re-attaches when a new reply starts.
 */
export function useAudioAmplitude(audioEl: HTMLAudioElement | null): number {
  const [amplitude, setAmplitude] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioEl) {
      setAmplitude(0);
      return;
    }

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    let source: MediaElementAudioSourceNode;
    try {
      source = ctx.createMediaElementSource(audioEl);
    } catch {
      // Element already connected from a prior turn — recreate via clone not possible;
      // fall back to synthetic mouth motion while speaking.
      setAmplitude(0.35);
      return () => {
        void ctx.close();
        setAmplitude(0);
      };
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = ((data[i] ?? 128) - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setAmplitude(Math.min(1, rms * 4));
      rafRef.current = requestAnimationFrame(tick);
    }

    void ctx.resume().then(() => tick());

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
      void ctx.close();
      setAmplitude(0);
    };
  }, [audioEl]);

  return amplitude;
}
