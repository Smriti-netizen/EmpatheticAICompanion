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


def _resolve_language(locale: str | None) -> str | None:
    """Pick Whisper language. Prefer auto so Hinglish / code-switch is heard.

    English-only models (*.en) cannot take a language hint.
    Session locale is only a soft hint when WHISPER_LANGUAGE is not auto —
    never force English when the user may speak Hindi mid-session.
    """
    if settings.whisper_model.endswith(".en"):
        logger.warning(
            "Whisper model %s is English-only — Hindi/Hinglish will not transcribe. "
            "Set WHISPER_MODEL=small (or base) and WHISPER_LANGUAGE=auto.",
            settings.whisper_model,
        )
        return None

    cfg = (settings.whisper_language or "").strip().lower()
    if cfg in ("", "auto"):
        # Auto-detect every utterance — English session + Hindi speech works.
        return None
    if cfg == "locale" and locale:
        return locale.replace("_", "-").split("-", 1)[0].lower() or None
    return cfg


def transcribe(file_path: Path, locale: str | None = None) -> tuple[str, str | None]:
    """Return (transcript, detected_language_code). Language may be None if unknown."""
    if ensure_ready() != "ready" or _model is None:
        raise RuntimeError(
            f"Whisper is not available on this machine. {_last_error or ''}".strip()
        )

    language = _resolve_language(locale)
    import time

    start = time.perf_counter()
    segments, info = _model.transcribe(
        str(file_path),
        language=language,
        beam_size=max(1, settings.whisper_beam_size),
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 250},
        condition_on_previous_text=False,
        # Drop soft noise / empty mics quickly instead of forcing a transcript.
        no_speech_threshold=0.6,
        # Helps mixed English–Indic utterances stay coherent.
        multilingual=not settings.whisper_model.endswith(".en"),
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()
    detected = getattr(info, "language", None)
    if isinstance(detected, str):
        detected = detected.strip().lower() or None
    else:
        detected = None
    logger.info(
        "Transcribed %.2fs audio in %.2fs → %d chars (lang=%s detected=%s)",
        getattr(info, "duration", 0.0),
        time.perf_counter() - start,
        len(text),
        language or "auto",
        detected,
    )
    return text, detected
