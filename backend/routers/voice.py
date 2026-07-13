import base64
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.session import get_db
from services import stt_whisper, tts_piper
from services.session_service import SessionServiceError, chat_turn

router = APIRouter(prefix="/api/v1/sessions", tags=["voice"])


@router.post("/{session_id}/voice")
async def session_voice(
    session_id: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if stt_whisper.ensure_ready() != "ready":
        raise HTTPException(
            status_code=501,
            detail="Voice STT not available. Install faster-whisper to enable.",
        )

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = Path(tmp.name)

    try:
        transcript = stt_whisper.transcribe(tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    if not transcript:
        raise HTTPException(status_code=400, detail="Could not transcribe audio")

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
    }

    if not result["crisis"] and tts_piper.status() == "ready":
        try:
            wav = tts_piper.synthesize(result["reply"])
            payload["audio_base64"] = base64.b64encode(wav).decode("ascii")
        except Exception:
            payload["audio_base64"] = None

    return payload
