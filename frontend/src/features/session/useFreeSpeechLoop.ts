import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "listening" | "user_speaking" | "processing";

interface UseFreeSpeechLoopArgs {
  active: boolean;
  locale?: string | null;
  onUtterance: (transcript: string) => Promise<void>;
}

/**
 * Browser SpeechRecognition turn-taking (pause ends utterance).
 * Do not use custom RMS silence VAD — it looped on ambient noise.
 */
export function useFreeSpeechLoop({ active, locale, onUtterance }: UseFreeSpeechLoopArgs) {
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
    // en-IN still hears a lot of Hinglish (romanized). Pure Hindi is better via
    // server Whisper (multilingual model) — browser STT is a fallback only.
    const loc = (locale || "en-IN").replace("_", "-");
    recognition.lang = loc.toLowerCase().startsWith("en") ? "en-IN" : loc;
    recognition.maxAlternatives = 3;

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
      if (code === "network") {
        setError("Speech recognition network error. Try Type instead, or refresh.");
      }
    };

    recognition.onend = () => {
      if (cancelled) return;

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
      }
      setPhase("idle");
    };
  }, [active, locale]);

  return {
    phase,
    error,
    partial,
    userSpeaking: phase === "user_speaking",
    listening: phase === "listening" || phase === "user_speaking",
    forceEndTurn: () => forceEndRef.current?.(),
  };
}
