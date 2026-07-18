import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.session import get_db
from services import stt_whisper
from services.session_service import SessionServiceError, chat_turn
from services.voice_audio import attach_tts, sync_session_voice_prefs

router = APIRouter(prefix="/api/v1/sessions", tags=["voice"])

_VALID_AVATARS = frozenset({"hop", "aura", "spark"})


@router.post("/{session_id}/voice")
async def session_voice(
    session_id: str,
    audio: UploadFile = File(...),
    avatar_id: str | None = Form(default=None),
    locale: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    if stt_whisper.ensure_ready() != "ready":
        raise HTTPException(
            status_code=501,
            detail="Voice STT not available. Install faster-whisper (see scripts/setup_voice.ps1).",
        )

    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = Path(tmp.name)

    clean_avatar = avatar_id if avatar_id in _VALID_AVATARS else None
    voice_key, session_locale = sync_session_voice_prefs(
        db, session_id, clean_avatar, locale
    )

    try:
        transcript = stt_whisper.transcribe(tmp_path, locale=session_locale)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    # Silence / no speech — soft empty turn (HTTP 200). UI stays on "Listening".
    if not transcript:
        return {
            "transcript": "",
            "reply": "",
            "crisis": False,
            "expression": "listening",
            "remaining_sec": None,
            "audio_base64": None,
            "audio_mime": "audio/wav",
            "empty": True,
            "avatar_id": voice_key,
            "locale": session_locale,
        }

    try:
        result = await chat_turn(db, session_id, transcript)
    except SessionServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    payload = {
        "transcript": transcript,
        "reply": result["reply"],
        "crisis": result["crisis"],
        "expression": result["expression"],
        "remaining_sec": result["remaining_sec"],
        "audio_base64": None,
        "audio_mime": "audio/wav",
        "empty": False,
    }
    return await attach_tts(payload, result["reply"], voice_key, locale=session_locale)
