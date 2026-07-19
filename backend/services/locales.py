"""Session locale helpers — English-only for reply quality (MVP)."""

from __future__ import annotations

# Multilingual reply modes are disabled for now: STT/LLM quality was too uneven.
# Clients may still speak Hinglish; the counselor always answers in English.
SUPPORTED_LOCALES: frozenset[str] = frozenset({"en-IN"})

LOCALE_LANGUAGE_NAME: dict[str, str] = {
    "en-IN": "English",
}


def normalize_locale(value: str | None) -> str:
    """Always English for counselor replies / TTS preference."""
    _ = value
    return "en-IN"


def language_instruction(locale: str | None) -> str:
    _ = locale
    return (
        "[LANGUAGE]\n"
        "Reply language (LOCKED): easy natural English only.\n"
        "The client may speak English, Hindi, Hinglish, or a mix — understand them, "
        "but ALWAYS answer in soft conversational English. Never reply in Hindi or "
        "any other language. Never write a bilingual double reply. "
        "Never talk about languages or ask them to switch.\n"
        "Keep a light, Calmi-like tone: warm, gentle, short (1–3 sentences + one question). "
        "Ground every reply in what they actually said."
    )
