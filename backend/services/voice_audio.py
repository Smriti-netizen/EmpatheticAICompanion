"""Attach synthesized counselor audio to API payloads when TTS is ready."""

from __future__ import annotations

import base64
import logging

from services import tts

logger = logging.getLogger(__name__)


async def attach_tts(payload: dict, text: str | None = None) -> dict:
    """Mutate payload with audio_base64 / audio_mime when possible."""
    spoken = (text or payload.get("reply") or payload.get("opening_message") or "").strip()
    payload.setdefault("audio_base64", None)
    payload.setdefault("audio_mime", "audio/wav")
    if not spoken or payload.get("crisis"):
        return payload
    if tts.status() != "ready":
        return payload
    try:
        audio, mime = await tts.synthesize_async(spoken)
        payload["audio_base64"] = base64.b64encode(audio).decode("ascii")
        payload["audio_mime"] = mime
    except Exception as exc:
        logger.warning("TTS failed: %s", exc)
        payload["audio_base64"] = None
    return payload
