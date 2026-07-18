/** Session languages supported by edge-tts + browser speech. */

export type SessionLocale =
  | "en-IN"
  | "hi-IN"
  | "bn-IN"
  | "ta-IN"
  | "te-IN"
  | "mr-IN"
  | "gu-IN"
  | "kn-IN"
  | "ml-IN";

export interface LocaleOption {
  id: SessionLocale;
  label: string;
  native: string;
}

export const SESSION_LOCALES: LocaleOption[] = [
  { id: "en-IN", label: "English", native: "English" },
  { id: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { id: "bn-IN", label: "Bengali", native: "বাংলা" },
  { id: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { id: "te-IN", label: "Telugu", native: "తెలుగు" },
  { id: "mr-IN", label: "Marathi", native: "मराठी" },
  { id: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { id: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { id: "ml-IN", label: "Malayalam", native: "മലയാളം" },
];

const LOCALE_IDS = new Set<string>(SESSION_LOCALES.map((l) => l.id));

export function isSessionLocale(value: string | null | undefined): value is SessionLocale {
  return !!value && LOCALE_IDS.has(value);
}

export function normalizeLocale(value: string | null | undefined): SessionLocale {
  return isSessionLocale(value) ? value : "en-IN";
}

/** Human name for LLM language instructions. */
export const LOCALE_LANGUAGE_NAME: Record<SessionLocale, string> = {
  "en-IN": "English (Indian)",
  "hi-IN": "Hindi",
  "bn-IN": "Bengali",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "mr-IN": "Marathi",
  "gu-IN": "Gujarati",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
};
