"""Unified TTS: Piper when configured, else edge-tts neural voices."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from services import tts_piper

logger = logging.getLogger(__name__)

_EDGE_VOICE = "en-US-JennyNeural"


def status() -> str:
    if tts_piper.status() == "ready":
        return "ready"
    try:
        import edge_tts  # noqa: F401

        return "ready"
    except Exception:
        return "skipped"


def engine() -> str:
    if tts_piper.status() == "ready":
        return "piper"
    try:
        import edge_tts  # noqa: F401

        return "edge-tts"
    except Exception:
        return "none"


async def synthesize_async(text: str) -> tuple[bytes, str]:
    """Return (audio_bytes, mime_type)."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("Nothing to synthesize")

    if tts_piper.status() == "ready":
        return tts_piper.synthesize(cleaned), "audio/wav"

    return await _edge_synthesize(cleaned), "audio/mpeg"


async def _edge_synthesize(text: str) -> bytes:
    import edge_tts

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "out.mp3"
        communicate = edge_tts.Communicate(text, _EDGE_VOICE)
        await communicate.save(str(out))
        return out.read_bytes()
