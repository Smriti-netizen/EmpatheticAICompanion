from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from db.models import CounselingSession, Message, User
from db.session import get_db
from services.ids import new_id, utc_now_iso
from services.session_service import SessionServiceError, chat_turn, close_session, remaining_seconds, start_session

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


class ChatTurnRequest(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    avatar_id: str | None = Field(default=None, pattern="^(hop|aura|spark)$")
    locale: str | None = None


class CloseRequest(BaseModel):
    mood_end: int | None = Field(default=None, ge=1, le=5)


class PracticeSessionRequest(BaseModel):
    user_id: str
    avatar_id: str | None = Field(default=None, pattern="^(hop|aura|spark)$")
    locale: str | None = None


class StartSessionRequest(BaseModel):
    avatar_id: str | None = Field(default=None, pattern="^(hop|aura|spark)$")
    locale: str | None = None


@router.post("/practice")
def create_practice_session(body: PracticeSessionRequest, db: Session = Depends(get_db)):
    """Start-now session: joinable immediately, 30 minutes long."""
    user = db.get(User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = utc_now_iso()
    session = CounselingSession(
        id=new_id(),
        user_id=body.user_id,
        booking_id=None,
        status="scheduled",
        scheduled_at=now,
        duration_target_sec=settings.session_practice_duration_sec,
    )
    db.add(session)
    db.commit()

    if body.avatar_id or body.locale:
        from services.voice_audio import sync_session_voice_prefs

        sync_session_voice_prefs(db, session.id, body.avatar_id, body.locale)

    return {"session_id": session.id, "scheduled_at": session.scheduled_at, "status": session.status}


@router.post("/{session_id}/start")
async def start(
    session_id: str,
    body: StartSessionRequest | None = None,
    db: Session = Depends(get_db),
):
    try:
        from services.voice_audio import attach_tts, sync_session_voice_prefs

        payload = await start_session(db, session_id)
        prefs = body or StartSessionRequest()
        voice_key, locale = sync_session_voice_prefs(
            db, session_id, prefs.avatar_id, prefs.locale
        )
        return await attach_tts(
            payload, payload.get("opening_message"), voice_key, locale=locale
        )
    except SessionServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.get(CounselingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.scalars(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    ).all()
    return {
        "session_id": session.id,
        "status": session.status,
        "scheduled_at": session.scheduled_at,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "remaining_sec": remaining_seconds(session),
        "messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at}
            for m in messages
        ],
    }


@router.post("/{session_id}/chat")
async def session_chat(session_id: str, body: ChatTurnRequest, db: Session = Depends(get_db)):
    try:
        from services.voice_audio import attach_tts, sync_session_voice_prefs

        result = await chat_turn(db, session_id, body.content)
        # Always re-sync from client so Coco isn't stuck on a stale Milo voice.
        voice_key, locale = sync_session_voice_prefs(
            db, session_id, body.avatar_id, body.locale
        )
        return await attach_tts(result, result.get("reply"), voice_key, locale=locale)
    except SessionServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/{session_id}/close")
async def session_close(session_id: str, body: CloseRequest, db: Session = Depends(get_db)):
    try:
        return await close_session(db, session_id, body.mood_end)
    except SessionServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
