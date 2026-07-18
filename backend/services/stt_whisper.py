"""faster-whisper STT adapter. Optional until models are installed."""

from __future__ import annotations

import logging
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

_model = None
_status = "skipped"
_last_error: str | None = None


def status() -> str:
    return _status


def last_error() -> str | None:
    return _last_error


def ensure_ready() -> str:
    global _model, _status, _last_error
    if _model is not None:
        _status = "ready"
        _last_error = None
        return _status
    try:
        import os

        from faster_whisper import WhisperModel

        threads = max(1, (os.cpu_count() or 4))
        logger.info(
            "Loading Whisper model %s (cpu/int8, threads=%d)…",
            settings.whisper_model,
            threads,
        )
        _model = WhisperModel(
            settings.whisper_model,
            device="cpu",
            compute_type="int8",
            cpu_threads=threads,
        )
        _status = "ready"
        _last_error = None
        logger.info("Whisper ready")
    except Exception as exc:
        logger.warning("Whisper unavailable: %s", exc, exc_info=True)
        _status = "skipped"
        _last_error = str(exc)
    return _status


def transcribe(file_path: Path) -> str:
    if ensure_ready() != "ready" or _model is None:
        raise RuntimeError(
            f"Whisper is not available on this machine. {_last_error or ''}".strip()
        )
    # English-only models reject the language kwarg; guard it.
    language = None if settings.whisper_model.endswith(".en") else (
        settings.whisper_language or None
    )
    import time

    start = time.perf_counter()
    segments, info = _model.transcribe(
        str(file_path),
        language=language,
        beam_size=max(1, settings.whisper_beam_size),
        vad_filter=True,  # drop silence → faster + fewer hallucinations
        vad_parameters={"min_silence_duration_ms": 300},
        condition_on_previous_text=False,
        no_speech_threshold=0.5,
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()
    logger.info(
        "Transcribed %.2fs audio in %.2fs → %d chars",
        getattr(info, "duration", 0.0),
        time.perf_counter() - start,
        len(text),
    )
    return text
