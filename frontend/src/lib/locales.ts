/** Session language — English only (multilingual replies paused for quality). */

export type SessionLocale = "en-IN";

export interface LocaleOption {
  id: SessionLocale;
  label: string;
  native: string;
}

export const SESSION_LOCALES: LocaleOption[] = [
  { id: "en-IN", label: "English", native: "English" },
];

export function isSessionLocale(value: string | null | undefined): value is SessionLocale {
  return value === "en-IN";
}

export function normalizeLocale(_value: string | null | undefined): SessionLocale {
  return "en-IN";
}

export const LOCALE_LANGUAGE_NAME: Record<SessionLocale, string> = {
  "en-IN": "English",
};
