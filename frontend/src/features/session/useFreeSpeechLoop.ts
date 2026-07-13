import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "listening" | "user_speaking" | "processing";

interface UseFreeSpeechLoopArgs {
  active: boolean;
  onUtterance: (transcript: string) => Promise<void>;
}

/**
 * Turn-based voice like HackerRank Interview AI:
 * Browser SpeechRecognition listens → when the user pauses, Chrome ends the
 * utterance → we send the transcript → counselor replies → listen again.
 *
 * We do NOT use custom RMS silence VAD for turn-taking (that stuck in a
 * listening loop with ambient noise / empty transcripts).
 */
export function useFreeSpeechLoop({ active, onUtterance }: UseFreeSpeechLoopArgs) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState("");

  const onUtteranceRef = useRef(onUtterance);
  onUtteranceRef.current = onUtterance;
  const forceEndRef = useRef<(() => void) | null>(null);
  const commitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      setPartial("");
      forceEndRef.current = null;
      commitRef.current = null;
      return;
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Speech needs Chrome or Edge. Use “Type instead” below.");
      return;
    }

    let cancelled = false;
    let recognition: SpeechRecognition | null = null;
    let processing = false;
    let finalTranscript = "";
    let interimTranscript = "";
    let restartTimer = 0;
    let silenceCommitTimer = 0;

    function currentText() {
      return `${finalTranscript} ${interimTranscript}`.trim();
    }

    function clearSilenceCommit() {
      if (silenceCommitTimer) {
        window.clearTimeout(silenceCommitTimer);
        silenceCommitTimer = 0;
      }
    }

    /** After a final chunk, wait briefly for more speech, then send. */
    function scheduleCommitAfterFinal() {
      clearSilenceCommit();
      silenceCommitTimer = window.setTimeout(() => {
        silenceCommitTimer = 0;
        void commitTurn();
      }, 900);
    }

    async function commitTurn() {
      if (cancelled || processing) return;
      const text = currentText();
      if (!text) return;

      processing = true;
      clearSilenceCommit();
      setPhase("processing");
      setPartial(text);

      try {
        recognition?.stop();
      } catch {
        // ignore
      }

      finalTranscript = "";
      interimTranscript = "";

      try {
        await onUtteranceRef.current(text);
      } catch {
        if (!cancelled) {
          setError("Could not reach counselor. I'll keep listening.");
        }
      }

      // CallRoom usually sets active=false during reply (this effect cleans up).
      processing = false;
      if (!cancelled) {
        setPartial("");
        setPhase("listening");
        startRecognition();
      }
    }

    function startRecognition() {
      if (cancelled || processing) return;
      try {
        recognition?.start();
        setPhase((p) => (p === "processing" ? p : "listening"));
      } catch {
        // InvalidStateError if already started — ignore
      }
    }

    recognition = new SpeechRecognitionCtor();
    // continuous=false: Chrome ends when the user pauses (HackerRank-style turns).
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!cancelled && !processing) setPhase("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (processing) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalTranscript = `${finalTranscript} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      interimTranscript = interim;
      const combined = currentText();
      setPartial(combined);
      if (combined) setPhase("user_speaking");

      // Final segment arrived — commit soon unless more speech continues.
      if (finalTranscript && !interim) {
        scheduleCommitAfterFinal();
      } else {
        clearSilenceCommit();
      }
    };

    recognition.onerror = (event: Event) => {
      const code = (event as { error?: string }).error;
      if (code === "not-allowed") {
        setError("Microphone permission denied. Allow mic, or use Type instead.");
        return;
      }
      // no-speech / aborted / network — restart below via onend
      if (code === "network") {
        setError("Speech recognition network error. Try Type instead, or refresh.");
      }
    };

    recognition.onend = () => {
      if (cancelled) return;

      // Non-continuous: utterance ended (user paused). Send if we have text.
      if (!processing) {
        const text = currentText();
        if (text) {
          void commitTurn();
          return;
        }
        // Still listening — Chrome stopped with no words; restart quickly.
        restartTimer = window.setTimeout(() => {
          if (!cancelled && !processing) startRecognition();
        }, 180);
      }
    };

    forceEndRef.current = () => {
      clearSilenceCommit();
      void commitTurn();
    };
    commitRef.current = () => {
      clearSilenceCommit();
      void commitTurn();
    };

    setError(null);
    setPhase("listening");
    startRecognition();

    return () => {
      cancelled = true;
      processing = true;
      forceEndRef.current = null;
      commitRef.current = null;
      clearSilenceCommit();
      window.clearTimeout(restartTimer);
      try {
        recognition?.abort();
      } catch {
        // ignore
      }
      setPhase("idle");
    };
  }, [active]);

  return {
    phase,
    error,
    partial,
    userSpeaking: phase === "user_speaking",
    listening: phase === "listening" || phase === "user_speaking",
    forceEndTurn: () => forceEndRef.current?.(),
  };
}
