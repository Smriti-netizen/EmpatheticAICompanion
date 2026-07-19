"""TTS: per-avatar mature edge-tts voices (EN + Indic), Piper fallback."""

from __future__ import annotations

import logging
import re
import tempfile
from pathlib import Path

from services import tts_piper

logger = logging.getLogger(__name__)

# hop=Milo (calm mature man), aura=Coco (warm mature woman),
# spark=Ziggy (grounded mature man — distinct timbre from Milo).
# No cute / high-pitched voices — calm adult pacing throughout.
_EDGE_VOICES: dict[str, dict[str, dict[str, str]]] = {
    "hop": {
        # US mature male — deliberately not Indian/British so Milo ≠ Ziggy.
        "en": {"voice": "en-US-AndrewNeural", "rate": "-6%", "pitch": "-3Hz"},
        "en-in": {"voice": "en-US-AndrewNeural", "rate": "-6%", "pitch": "-3Hz"},
        "hi": {"voice": "hi-IN-MadhurNeural", "rate": "-5%", "pitch": "-2Hz"},
        "bn": {"voice": "bn-IN-BashkarNeural", "rate": "-5%", "pitch": "-2Hz"},
        "ta": {"voice": "ta-IN-ValluvarNeural", "rate": "-5%", "pitch": "-2Hz"},
        "te": {"voice": "te-IN-MohanNeural", "rate": "-5%", "pitch": "-2Hz"},
        "mr": {"voice": "mr-IN-ManoharNeural", "rate": "-5%", "pitch": "-2Hz"},
        "gu": {"voice": "gu-IN-NiranjanNeural", "rate": "-5%", "pitch": "-2Hz"},
        "kn": {"voice": "kn-IN-GaganNeural", "rate": "-5%", "pitch": "-2Hz"},
        "ml": {"voice": "ml-IN-MidhunNeural", "rate": "-5%", "pitch": "-2Hz"},
    },
    "aura": {
        # Coco is always a mature woman — never share male Neural voices with Milo/Ziggy.
        "en": {"voice": "en-US-AriaNeural", "rate": "-4%", "pitch": "+0Hz"},
        "en-in": {"voice": "en-IN-NeerjaNeural", "rate": "-4%", "pitch": "+1Hz"},
        "hi": {"voice": "hi-IN-SwaraNeural", "rate": "-4%", "pitch": "+1Hz"},
        "bn": {"voice": "bn-IN-TanishaaNeural", "rate": "-4%", "pitch": "+0Hz"},
        "ta": {"voice": "ta-IN-PallaviNeural", "rate": "-4%", "pitch": "+0Hz"},
        "te": {"voice": "te-IN-ShrutiNeural", "rate": "-4%", "pitch": "+0Hz"},
        "mr": {"voice": "mr-IN-AarohiNeural", "rate": "-4%", "pitch": "+0Hz"},
        "gu": {"voice": "gu-IN-DhwaniNeural", "rate": "-4%", "pitch": "+0Hz"},
        "kn": {"voice": "kn-IN-SapnaNeural", "rate": "-4%", "pitch": "+0Hz"},
        "ml": {"voice": "ml-IN-SobhanaNeural", "rate": "-4%", "pitch": "+0Hz"},
    },
    "spark": {
        # Distinct from Milo: British mature male (never share Prabhat with hop).
        "en": {"voice": "en-GB-RyanNeural", "rate": "-2%", "pitch": "+0Hz"},
        "en-in": {"voice": "en-GB-RyanNeural", "rate": "-2%", "pitch": "+0Hz"},
        # Hindi only has Madhur for male — use warmer/faster pacing vs Milo's slow calm.
        "hi": {"voice": "hi-IN-MadhurNeural", "rate": "+4%", "pitch": "+3Hz"},
        "bn": {"voice": "bn-IN-BashkarNeural", "rate": "+3%", "pitch": "+2Hz"},
        "ta": {"voice": "ta-IN-ValluvarNeural", "rate": "+3%", "pitch": "+2Hz"},
        "te": {"voice": "te-IN-MohanNeural", "rate": "+3%", "pitch": "+2Hz"},
        "mr": {"voice": "mr-IN-ManoharNeural", "rate": "+3%", "pitch": "+2Hz"},
        "gu": {"voice": "gu-IN-NiranjanNeural", "rate": "+3%", "pitch": "+2Hz"},
        "kn": {"voice": "kn-IN-GaganNeural", "rate": "+3%", "pitch": "+2Hz"},
        "ml": {"voice": "ml-IN-MidhunNeural", "rate": "+3%", "pitch": "+2Hz"},
    },
}

_DEFAULT_VOICES: dict[str, dict[str, str]] = {
    "en": {"voice": "en-US-JennyNeural", "rate": "-4%", "pitch": "+0Hz"},
    "en-in": {"voice": "en-IN-NeerjaNeural", "rate": "-4%", "pitch": "+0Hz"},
    "hi": {"voice": "hi-IN-SwaraNeural", "rate": "-3%", "pitch": "+0Hz"},
    "bn": {"voice": "bn-IN-TanishaaNeural", "rate": "-3%", "pitch": "+0Hz"},
    "ta": {"voice": "ta-IN-PallaviNeural", "rate": "-3%", "pitch": "+0Hz"},
    "te": {"voice": "te-IN-ShrutiNeural", "rate": "-3%", "pitch": "+0Hz"},
    "mr": {"voice": "mr-IN-AarohiNeural", "rate": "-3%", "pitch": "+0Hz"},
    "gu": {"voice": "gu-IN-DhwaniNeural", "rate": "-3%", "pitch": "+0Hz"},
    "kn": {"voice": "kn-IN-SapnaNeural", "rate": "-3%", "pitch": "+0Hz"},
    "ml": {"voice": "ml-IN-SobhanaNeural", "rate": "-3%", "pitch": "+0Hz"},
}

# Script → language key (used when text itself reveals the language).
_SCRIPT_LANG: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"[\u0900-\u097F]"), "hi"),  # Devanagari (Hindi / Marathi)
    (re.compile(r"[\u0980-\u09FF]"), "bn"),  # Bengali
    (re.compile(r"[\u0B80-\u0BFF]"), "ta"),  # Tamil
    (re.compile(r"[\u0C00-\u0C7F]"), "te"),  # Telugu
    (re.compile(r"[\u0A80-\u0AFF]"), "gu"),  # Gujarati
    (re.compile(r"[\u0C80-\u0CFF]"), "kn"),  # Kannada
    (re.compile(r"[\u0D00-\u0D7F]"), "ml"),  # Malayalam
]

_SUPPORTED_LANGS = frozenset(_DEFAULT_VOICES) | frozenset({"en", "en-in"})


def _mostly_latin(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return True
    latin = sum(1 for c in letters if ord(c) < 128)
    return (latin / len(letters)) >= 0.7


def _lang_from(text: str, locale: str | None) -> str:
    """Resolve TTS language key from text script, then user locale."""
    sample = text or ""
    for pattern, lang in _SCRIPT_LANG:
        if pattern.search(sample):
            # Devanagari: prefer Marathi when locale is mr-*, else Hindi.
            if lang == "hi":
                loc = (locale or "").lower().replace("_", "-")
                if loc.startswith("mr"):
                    return "mr"
            return lang

    loc = (locale or "en-IN").lower().replace("_", "-")
    # English / Latin replies should not be forced through Indic voices.
    if _mostly_latin(sample):
        if loc.startswith("en-in") or not loc.startswith("en"):
            return "en-in"
        return "en"

    if loc.startswith("en-in"):
        return "en-in"
    if loc.startswith("en"):
        return "en"
    prefix = loc.split("-", 1)[0]
    if prefix in _SUPPORTED_LANGS:
        return prefix
    return "en"


_MALE_NEURAL = frozenset(
    {
        "en-US-AndrewNeural",
        "en-GB-RyanNeural",
        "en-IN-PrabhatNeural",
        "hi-IN-MadhurNeural",
        "bn-IN-BashkarNeural",
        "ta-IN-ValluvarNeural",
        "te-IN-MohanNeural",
        "mr-IN-ManoharNeural",
        "gu-IN-NiranjanNeural",
        "kn-IN-GaganNeural",
        "ml-IN-MidhunNeural",
    }
)


def _voice_for(voice_key: str | None, lang: str) -> dict[str, str]:
    persona = _EDGE_VOICES.get(voice_key or "", {})
    if lang in persona:
        chosen = persona[lang]
    elif lang == "en-in" and "en" in persona:
        chosen = persona["en"]
    elif "en" in persona:
        chosen = persona["en"]
    else:
        chosen = _DEFAULT_VOICES.get(lang) or _DEFAULT_VOICES["en"]

    # Coco must never speak with a male Neural voice (stale persona / bad fallback).
    if voice_key == "aura" and chosen["voice"] in _MALE_NEURAL:
        logger.warning("Blocked male voice %s for Coco; using Neerja/Aria", chosen["voice"])
        fallback_lang = lang if lang in _EDGE_VOICES["aura"] else "en-in"
        return dict(_EDGE_VOICES["aura"][fallback_lang])
    return chosen


def resolve_voice_name(
    text: str,
    voice_key: str | None = None,
    locale: str | None = None,
) -> str:
    """Which edge-tts voice would be used (for API/debug + frontend sync)."""
    lang = _lang_from(text or "", locale)
    return _voice_for(voice_key, lang)["voice"]


def status() -> str:
    try:
        import edge_tts  # noqa: F401

        return "ready"
    except Exception:
        if tts_piper.status() == "ready":
            return "ready"
        return "skipped"


def engine() -> str:
    try:
        import edge_tts  # noqa: F401

        return "edge-tts"
    except Exception:
        if tts_piper.status() == "ready":
            return "piper"
        return "none"


async def synthesize_async(
    text: str,
    voice_key: str | None = None,
    locale: str | None = None,
) -> tuple[bytes, str]:
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("Nothing to synthesize")

    lang = _lang_from(cleaned, locale)
    primary = _voice_for(voice_key, lang)

    try:
        import edge_tts  # noqa: F401

        return await _edge_speak(cleaned, primary), "audio/mpeg"
    except Exception as exc:
        logger.warning(
            "edge-tts failed voice=%s lang=%s persona=%s (%s); trying same-gender fallback",
            primary.get("voice"),
            lang,
            voice_key,
            exc,
        )

    # Language switch often breaks Indic Neural voices. Retry in English with the
    # SAME persona gender so Coco never drops to Piper/male browser default.
    for retry_lang in ("en-in", "en"):
        if retry_lang == lang:
            continue
        alt = _voice_for(voice_key, retry_lang)
        if alt["voice"] == primary["voice"]:
            continue
        try:
            logger.info(
                "TTS retry persona=%s lang=%s→%s voice=%s",
                voice_key,
                lang,
                retry_lang,
                alt["voice"],
            )
            return await _edge_speak(cleaned, alt), "audio/mpeg"
        except Exception as retry_exc:
            logger.warning("edge-tts retry failed (%s)", retry_exc)

    # Absolute last edge attempt by gender (never Madhur for Coco).
    hard = (
        {"voice": "en-US-AriaNeural", "rate": "-4%", "pitch": "+0Hz"}
        if voice_key == "aura"
        else {"voice": "en-US-AndrewNeural", "rate": "-6%", "pitch": "-3Hz"}
        if voice_key == "hop"
        else {"voice": "en-GB-RyanNeural", "rate": "-2%", "pitch": "+0Hz"}
        if voice_key == "spark"
        else {"voice": "en-US-JennyNeural", "rate": "-4%", "pitch": "+0Hz"}
    )
    try:
        return await _edge_speak(cleaned, hard), "audio/mpeg"
    except Exception as hard_exc:
        logger.warning("edge-tts hard fallback failed (%s)", hard_exc)

    # Piper is a single shared voice (usually male) — never use it for Coco.
    if voice_key != "aura" and tts_piper.status() == "ready":
        return tts_piper.synthesize(cleaned), "audio/wav"

    raise RuntimeError("No TTS engine available")


async def _edge_speak(text: str, v: dict[str, str]) -> bytes:
    import edge_tts

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "out.mp3"
        communicate = edge_tts.Communicate(
            text,
            v["voice"],
            rate=v.get("rate", "+0%"),
            pitch=v.get("pitch", "+0Hz"),
        )
        await communicate.save(str(out))
        return out.read_bytes()


async def _edge_synthesize(text: str, voice_key: str | None, lang: str) -> bytes:
    return await _edge_speak(text, _voice_for(voice_key, lang))
