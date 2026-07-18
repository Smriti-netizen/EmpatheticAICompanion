"""Supported session locales for TTS / STT / counselor replies."""

from __future__ import annotations

SUPPORTED_LOCALES: frozenset[str] = frozenset(
    {
        "en-IN",
        "hi-IN",
        "bn-IN",
        "ta-IN",
        "te-IN",
        "mr-IN",
        "gu-IN",
        "kn-IN",
        "ml-IN",
    }
)

LOCALE_LANGUAGE_NAME: dict[str, str] = {
    "en-IN": "English (Indian)",
    "hi-IN": "Hindi",
    "bn-IN": "Bengali",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
}


def normalize_locale(value: str | None) -> str:
    if not value:
        return "en-IN"
    loc = value.replace("_", "-")
    # Accept bare language codes
    aliases = {
        "en": "en-IN",
        "hi": "hi-IN",
        "bn": "bn-IN",
        "ta": "ta-IN",
        "te": "te-IN",
        "mr": "mr-IN",
        "gu": "gu-IN",
        "kn": "kn-IN",
        "ml": "ml-IN",
    }
    if loc in SUPPORTED_LOCALES:
        return loc
    lower = loc.lower()
    for supported in SUPPORTED_LOCALES:
        if lower == supported.lower():
            return supported
    prefix = lower.split("-", 1)[0]
    if prefix in aliases:
        return aliases[prefix]
    return "en-IN"


def language_instruction(locale: str | None) -> str:
    loc = normalize_locale(locale)
    name = LOCALE_LANGUAGE_NAME.get(loc, "English")
    return (
        f"[LANGUAGE]\n"
        f"Session preference: {name} ({loc}). "
        "Real clients almost never speak pure formal language — they mix. "
        "Always understand whatever they say: English, Hindi, Hinglish, or mix with "
        "Bengali/Tamil/Telugu/etc. Never ask them to switch or repeat just because "
        "they mixed languages.\n"
        "Mirror their mix in your reply: if they speak Hinglish, reply in natural "
        "Hinglish; if they switch to Hindi mid-session, follow them; if they stay "
        f"in English, stay in easy conversational {name}. "
        "Prefer everyday spoken words over pure literary / textbook style. "
        "Keep the same short counseling cadence (1–3 sentences + one question)."
    )
