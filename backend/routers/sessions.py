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


class CloseRequest(BaseModel):
    mood_end: int | None = Field(default=None, ge=1, le=5)


class PracticeSessionRequest(BaseModel):
    user_id: str


@router.post("/practice")
def create_practice_session(body: PracticeSessionRequest, db: Session = Depends(get_db)):
    """Local/dev helper: create a session joinable immediately (no calendar wait)."""
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
        duration_target_sec=settings.session_duration_sec,
    )
    db.add(session)
    db.commit()
    return {"session_id": session.id, "scheduled_at": session.scheduled_at, "status": session.status}


@router.post("/{session_id}/start")
async def start(session_id: str, db: Session = Depends(get_db)):
    try:
        from services.voice_audio import attach_tts

        payload = await start_session(db, session_id)
        return await attach_tts(payload, payload.get("opening_message"))
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
        from services.voice_audio import attach_tts

        result = await chat_turn(db, session_id, body.content)
        return await attach_tts(result, result.get("reply"))
    except SessionServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/{session_id}/close")
async def session_close(session_id: str, body: CloseRequest, db: Session = Depends(get_db)):
    try:
        return await close_session(db, session_id, body.mood_end)
    except SessionServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
