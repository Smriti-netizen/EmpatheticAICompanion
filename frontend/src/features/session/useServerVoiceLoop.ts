import { useEffect, useRef, useState } from "react";

import { pickMimeType } from "../../lib/audio";

type Phase = "idle" | "listening" | "user_speaking" | "processing";

interface UseServerVoiceLoopArgs {
  /** Session live (not summary/starting). Mic stays open the whole time. */
  active: boolean;
  enabled: boolean;
  onAudio: (blob: Blob) => Promise<void>;
  /** Fired the moment the user starts talking while the avatar is speaking. */
  onInterrupt?: () => void;
  /** True while the counselor's TTS is playing (for barge-in detection). */
  speakingRef: React.MutableRefObject<boolean>;
}

/** Normal turn-taking while avatar is quiet (backup — explicit Done wins). */
const SPEECH_RMS = 0.038;
const SILENCE_MS = 1100;
const MIN_SPEECH_MS = 500;
const MAX_UTTERANCE_MS = 30000;
/** Barge-in must be louder + sustained so speaker echo doesn't cut TTS. */
const BARGE_RMS = 0.09;
const BARGE_HOLD_MS = 320;

type LoopControls = {
  /** User tapped "I'm done" — end capture and send now (primary turn end). */
  finishTurn: () => void;
};

/**
 * Mic + RMS capture with silence as a *backup* only.
 * Explicit finishTurn() is the source of truth for "I finished speaking".
 */
export function useServerVoiceLoop({
  active,
  enabled,
  onAudio,
  onInterrupt,
  speakingRef,
}: UseServerVoiceLoopArgs) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const onAudioRef = useRef(onAudio);
  onAudioRef.current = onAudio;
  const onInterruptRef = useRef(onInterrupt);
  onInterruptRef.current = onInterrupt;
  const controlsRef = useRef<LoopControls | null>(null);

  useEffect(() => {
    if (!active || !enabled) {
      setPhase("idle");
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let chunks: BlobPart[] = [];
    let tickId = 0;

    let capturing = false;
    let sending = false;
    let speechStartedAt = 0;
    let lastLoudAt = 0;
    let bargeSince = 0;

    function mime() {
      return pickMimeType() || "audio/webm";
    }

    function startRecorder() {
      if (!stream || cancelled) return;
      chunks = [];
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: mime() });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      mediaRecorder.start(200);
    }

    async function stopRecorder(minBytes: number): Promise<Blob | null> {
      const recorder = mediaRecorder;
      mediaRecorder = null;
      if (!recorder || recorder.state === "inactive") return null;
      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: recorder.mimeType || mime() }));
        try {
          recorder.stop();
        } catch {
          resolve(new Blob([], { type: mime() }));
        }
      });
      chunks = [];
      return blob.size > minBytes ? blob : null;
    }

    async function finalize(opts: { manual: boolean }) {
      if (sending || !capturing) return;
      capturing = false;
      sending = true;
      bargeSince = 0;
      setPhase("processing");
      // Manual Done: accept shorter clips; auto-silence keeps a stricter floor.
      const blob = await stopRecorder(opts.manual ? 800 : 2400);
      speechStartedAt = 0;

      if (blob) {
        try {
          await onAudioRef.current(blob);
        } catch {
          if (!cancelled) {
            setError("Could not reach counselor voice API. I'll keep listening.");
          }
        }
      }

      sending = false;
      if (!cancelled) setPhase("listening");
    }

    controlsRef.current = {
      finishTurn: () => {
        if (sending || cancelled) return;
        // If user hasn't been auto-detected yet, start a tiny capture window — no.
        // Only finalize an active capture; otherwise no-op (tap when speaking).
        if (!capturing) return;
        void finalize({ manual: true });
      },
    };

    async function boot() {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        if (!cancelled) setError("Microphone permission denied.");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") {
        try {
          await audioCtx.resume();
        } catch {
          // ignore
        }
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      setPhase("listening");

      tickId = window.setInterval(() => {
        if (cancelled || !analyser) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) sum += samples[i]! * samples[i]!;
        const rms = Math.sqrt(sum / samples.length);
        const now = Date.now();
        const avatarTalking = speakingRef.current;

        // While avatar speaks: only real barge-in (louder + held), never soft echo.
        if (avatarTalking && !capturing && !sending) {
          if (rms > BARGE_RMS) {
            if (!bargeSince) bargeSince = now;
            if (now - bargeSince >= BARGE_HOLD_MS) {
              capturing = true;
              speechStartedAt = now;
              lastLoudAt = now;
              startRecorder();
              setPhase("user_speaking");
              onInterruptRef.current?.();
            }
          } else {
            bargeSince = 0;
          }
          return;
        }

        if (rms > SPEECH_RMS) {
          lastLoudAt = now;
          bargeSince = 0;

          if (!capturing && !sending && !avatarTalking) {
            capturing = true;
            speechStartedAt = now;
            startRecorder();
            setPhase("user_speaking");
          }

          if (capturing && now - speechStartedAt > MAX_UTTERANCE_MS) {
            void finalize({ manual: false });
          }
          return;
        }

        // Silence timeout = convenience backup only (Done button is primary).
        if (
          capturing &&
          now - lastLoudAt > SILENCE_MS &&
          now - speechStartedAt > MIN_SPEECH_MS
        ) {
          void finalize({ manual: false });
        }
      }, 60);
    }

    void boot();

    return () => {
      cancelled = true;
      controlsRef.current = null;
      window.clearInterval(tickId);
      try {
        mediaRecorder?.stop();
      } catch {
        // ignore
      }
      stream?.getTracks().forEach((t) => t.stop());
      void audioCtx?.close();
      setPhase("idle");
    };
  }, [active, enabled, speakingRef]);

  return {
    phase,
    error,
    userSpeaking: phase === "user_speaking",
    listening: phase === "listening" || phase === "user_speaking",
    finishTurn: () => controlsRef.current?.finishTurn(),
  };
}
