/** Record mic audio and play counselor replies. */

export function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export async function playBase64Audio(
  audioBase64: string,
  mime = "audio/wav",
  onEnded?: () => void,
): Promise<HTMLAudioElement> {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnded?.();
  };
  await audio.play();
  return audio;
}

function pickNaturalVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefer = [
    /en-IN/i,
    /en-GB/i,
    /en-US/i,
    /Google.*English/i,
    /Microsoft.*(Aria|Jenny|Natasha|Neerja|Heera)/i,
  ];
  for (const pattern of prefer) {
    const match = voices.find((v) => pattern.test(`${v.name} ${v.lang}`));
    if (match) return match;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

/** Soften stiff punctuation before speaking. */
function humanizeForSpeech(text: string): string {
  return text
    .replace(/\s*\([^)]*(listening|cbt|mi|technique|validation)[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function speakWithBrowserTts(
  text: string,
  onEnd?: () => void,
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(humanizeForSpeech(text));
  utterance.rate = 0.92;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  const voice = pickNaturalVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  let started = false;
  const speakNow = () => {
    if (started) return;
    started = true;
    window.speechSynthesis.speak(utterance);
  };
  // Voices often load asynchronously on Windows/Chrome.
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.onvoiceschanged = () => {
      const late = pickNaturalVoice();
      if (late) utterance.voice = late;
      window.speechSynthesis.onvoiceschanged = null;
      speakNow();
    };
    window.setTimeout(speakNow, 300);
  } else {
    speakNow();
  }
  return utterance;
}

/** Browser STT fallback when server Whisper is not installed. */
export function transcribeWithBrowserSpeech(): Promise<string> {
  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  if (!SpeechRecognitionCtor) {
    return Promise.reject(
      new Error("Browser speech recognition is not supported. Type instead."),
    );
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!text) reject(new Error("No speech detected."));
      else resolve(text);
    };
    recognition.onerror = () => reject(new Error("Speech recognition failed."));
    recognition.start();
  });
}


export class MicRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.start();
  }

  async stop(): Promise<Blob> {
    const recorder = this.mediaRecorder;
    const stream = this.stream;
    if (!recorder) {
      throw new Error("Recorder was not started");
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(
          new Blob(this.chunks, {
            type: recorder.mimeType || "audio/webm",
          }),
        );
      };
      recorder.onerror = () => reject(new Error("Recording failed"));
      recorder.stop();
    });

    stream?.getTracks().forEach((track) => track.stop());
    this.mediaRecorder = null;
    this.stream = null;
    return blob;
  }

  cancel(): void {
    try {
      this.mediaRecorder?.stop();
    } catch {
      // ignore
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
  }
}
