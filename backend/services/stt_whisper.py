"""faster-whisper STT adapter. Optional until models are installed."""

from __future__ import annotations

import logging
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

_model = None
_status = "skipped"


def status() -> str:
    return _status


def ensure_ready() -> str:
    global _model, _status
    if _model is not None:
        _status = "ready"
        return _status
    try:
        from faster_whisper import WhisperModel

        _model = WhisperModel(
            settings.whisper_model,
            device="cpu",
            compute_type="int8",
        )
        _status = "ready"
    except Exception as exc:
        logger.warning("Whisper unavailable: %s", exc)
        _status = "skipped"
    return _status


def transcribe(file_path: Path) -> str:
    if ensure_ready() != "ready" or _model is None:
        raise RuntimeError("Whisper is not available on this machine.")
    segments, _ = _model.transcribe(str(file_path))
    return " ".join(segment.text.strip() for segment in segments).strip()
