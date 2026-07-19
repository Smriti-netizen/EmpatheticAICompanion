import type { AvatarId } from "../features/avatar/avatarCatalog";

export function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function base64ToBytes(audioBase64: string): Uint8Array {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function playBase64Audio(
  audioBase64: string,
  mime = "audio/wav",
  onEnded?: () => void,
): Promise<HTMLAudioElement> {
  const bytes = base64ToBytes(audioBase64);
  // Copy into a fresh Uint8Array so BlobPart typing accepts ArrayBuffer (not SharedArrayBuffer).
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.src = url;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnded?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    onEnded?.();
  };
  await audio.play();
  return audio;
}

/** Call once from a user gesture so later edge-tts playback is allowed on mobile. */
export async function unlockAudioPlayback(): Promise<void> {
  try {
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    await ctx.close();
  } catch {
    // Best-effort unlock; playback may still require a tap overlay.
  }
}

type VoiceLang = "en" | "hi" | "bn" | "ta" | "te" | "mr" | "gu" | "kn" | "ml";

const SCRIPT_LANG: [RegExp, VoiceLang][] = [
  [/[\u0900-\u097F]/, "hi"],
  [/[\u0980-\u09FF]/, "bn"],
  [/[\u0B80-\u0BFF]/, "ta"],
  [/[\u0C00-\u0C7F]/, "te"],
  [/[\u0A80-\u0AFF]/, "gu"],
  [/[\u0C80-\u0CFF]/, "kn"],
  [/[\u0D00-\u0D7F]/, "ml"],
];

/** Mature browser-TTS fallbacks — unique per avatar, never cute/high. */
const PERSONA_VOICE: Record<
  AvatarId,
  { patterns: Partial<Record<VoiceLang, RegExp[]>>; rate: number; pitch: number }
> = {
  hop: {
    patterns: {
      en: [/Andrew/i, /Guy/i, /en-US.*Male/i, /David/i, /Mark/i],
      // Never bare /hi-IN/ — that also matches female Hindi voices on some OSes.
      hi: [/Madhur/i, /hi-IN.*Male/i, /Male/i],
      bn: [/Bashkar/i, /Male/i],
      ta: [/Valluvar/i, /Male/i],
      te: [/Mohan/i, /Male/i],
      mr: [/Manohar/i, /Male/i],
      gu: [/Niranjan/i, /Male/i],
      kn: [/Gagan/i, /Male/i],
      ml: [/Midhun/i, /Male/i],
    },
    rate: 0.88,
    pitch: 0.92,
  },
  aura: {
    patterns: {
      // Female only — never bare /en-IN/ or /hi-IN/ (those match Prabhat/Madhur).
      en: [/Neerja/i, /Aria/i, /Jenny/i, /Zira/i, /Female/i, /en-IN.*Female/i],
      hi: [/Swara/i, /hi-IN.*Female/i, /Female/i],
      bn: [/Tanishaa/i, /Female/i],
      ta: [/Pallavi/i, /Female/i],
      te: [/Shruti/i, /Female/i],
      mr: [/Aarohi/i, /Female/i],
      gu: [/Dhwani/i, /Female/i],
      kn: [/Sapna/i, /Female/i],
      ml: [/Sobhana/i, /Female/i],
    },
    rate: 0.9,
    pitch: 1.02,
  },
  spark: {
    patterns: {
      en: [/Ryan/i, /en-GB/i, /Thomas/i, /Christopher/i, /Brian/i, /Steffan/i],
      hi: [/Madhur/i, /hi-IN.*Male/i, /Male/i],
      bn: [/Bashkar/i, /Male/i],
      ta: [/Valluvar/i, /Male/i],
      te: [/Mohan/i, /Male/i],
      mr: [/Manohar/i, /Male/i],
      gu: [/Niranjan/i, /Male/i],
      kn: [/Gagan/i, /Male/i],
      ml: [/Midhun/i, /Male/i],
    },
    rate: 0.96,
    pitch: 1.0,
  },
};

function detectLang(text: string, locale?: string | null): VoiceLang {
  for (const [pattern, lang] of SCRIPT_LANG) {
    if (pattern.test(text)) {
      if (lang === "hi" && (locale || "").toLowerCase().startsWith("mr")) return "mr";
      return lang;
    }
  }
  const loc = (locale || "en-IN").toLowerCase();
  const prefix = loc.split("-")[0] as VoiceLang;
  if (prefix && prefix !== "en" && SCRIPT_LANG.some(([, l]) => l === prefix)) {
    // Latin text with Indic locale → speak with English voice patterns
    return "en";
  }
  return "en";
}

function utteranceLang(
  lang: VoiceLang,
  locale?: string | null,
  avatarId?: AvatarId | null,
): string {
  if (lang === "en") {
    // Ziggy uses a British male voice — lock browser TTS to en-GB.
    if (avatarId === "spark") return "en-GB";
    const loc = (locale || "en-IN").toLowerCase();
    return loc.startsWith("en-gb") ? "en-GB" : "en-IN";
  }
  return `${lang}-IN`;
}

const MALE_VOICE_RE =
  /male|andrew|ryan|prabhat|guy|david|mark|ravi|madhur|george|thomas|brian|christopher|steffan|ashwin|bashkar|valluvar|mohan|manohar|niranjan|gagan|midhun/i;
const FEMALE_VOICE_RE =
  /female|aria|neerja|jenny|zira|swara|sonia|susan|hazel|natasha|raveena|tanishaa|pallavi|shruti|aarohi|dhwani|sapna|sobhana|heera/i;

function voiceLabel(v: SpeechSynthesisVoice): string {
  return `${v.name} ${v.lang}`;
}

function pickPersonaVoice(
  avatarId?: AvatarId | null,
  lang: VoiceLang = "en",
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const wantFemale = avatarId === "aura";
  const wantMale = avatarId === "hop" || avatarId === "spark";
  const genderOk = (v: SpeechSynthesisVoice) => {
    const label = voiceLabel(v);
    if (wantFemale && MALE_VOICE_RE.test(label)) return false;
    if (wantMale && FEMALE_VOICE_RE.test(label)) return false;
    return true;
  };

  const persona = avatarId ? PERSONA_VOICE[avatarId] : null;
  const patterns = persona?.patterns[lang] ?? [];
  for (const pattern of patterns) {
    const match = voices.find((v) => pattern.test(voiceLabel(v)) && genderOk(v));
    if (match) return match;
  }

  if (lang !== "en") {
    const byLang = voices.find(
      (v) => v.lang.toLowerCase().startsWith(lang) && genderOk(v),
    );
    if (byLang) return byLang;
  }

  if (wantFemale) {
    // Hindi female voices are often missing on Windows — never fall through to
    // the OS default (usually male). Prefer any installed female voice instead.
    return (
      voices.find((v) => FEMALE_VOICE_RE.test(voiceLabel(v))) ??
      voices.find(
        (v) => /en-IN|en-US|en-GB/i.test(v.lang) && !MALE_VOICE_RE.test(voiceLabel(v)),
      ) ??
      voices.find((v) => !MALE_VOICE_RE.test(voiceLabel(v))) ??
      null
    );
  }

  if (wantMale) {
    const prefer =
      avatarId === "spark"
        ? [/Ryan/i, /en-GB/i, /Andrew/i, /Male/i]
        : [/Andrew/i, /en-US.*Male/i, /Guy/i, /Male/i];
    for (const pattern of prefer) {
      const match = voices.find((v) => pattern.test(voiceLabel(v)) && genderOk(v));
      if (match) return match;
    }
    return (
      voices.find((v) => MALE_VOICE_RE.test(voiceLabel(v))) ??
      voices.find((v) => !FEMALE_VOICE_RE.test(voiceLabel(v))) ??
      null
    );
  }

  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

function humanizeForSpeech(text: string): string {
  return text
    .replace(/\s*\([^)]*(listening|cbt|mi|technique|validation)[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function speakWithBrowserTts(
  text: string,
  onEnd?: () => void,
  opts?: { avatarId?: AvatarId | null; locale?: string | null },
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel();
  const lang = detectLang(text, opts?.locale);
  const persona = opts?.avatarId ? PERSONA_VOICE[opts.avatarId] : null;
  const utterance = new SpeechSynthesisUtterance(humanizeForSpeech(text));
  utterance.rate = persona?.rate ?? 0.9;
  utterance.pitch = persona?.pitch ?? 0.98;
  utterance.volume = 1;
  // If Indic lang has no persona voice installed, speak with English locale tag
  // but keep the gender-correct voice — avoids OS default male for Hindi.
  let voice = pickPersonaVoice(opts?.avatarId, lang);
  let speakLang = utteranceLang(lang, opts?.locale, opts?.avatarId);
  if (!voice && lang !== "en") {
    voice = pickPersonaVoice(opts?.avatarId, "en");
    speakLang =
      opts?.avatarId === "spark"
        ? "en-GB"
        : opts?.avatarId === "aura"
          ? "en-IN"
          : "en-US";
  }
  utterance.lang = speakLang;
  if (voice) utterance.voice = voice;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  let started = false;
  const speakNow = () => {
    if (started) return;
    started = true;
    window.speechSynthesis.speak(utterance);
  };
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.onvoiceschanged = () => {
      let late = pickPersonaVoice(opts?.avatarId, lang);
      if (!late && lang !== "en") late = pickPersonaVoice(opts?.avatarId, "en");
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

export function transcribeWithBrowserSpeech(
  locale?: string | null,
): Promise<string> {
  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  if (!SpeechRecognitionCtor) {
    return Promise.reject(
      new Error("Browser speech recognition is not supported. Type instead."),
    );
  }

  const lang = (locale || "en-IN").toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
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
