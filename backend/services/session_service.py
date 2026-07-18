"""Session counseling orchestration: safety → memory → LLM → persist."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from db.models import CounselingSession, Message, SafetyEvent, SessionNote, UserProfile
from services import avatar_hints
from services.ids import new_id, utc_now_iso
from services.memory import build_memory_block_for_user
from services.ollama_client import OllamaError, chat as ollama_chat
from services.safety import (
    CRISIS_CARE_HINT,
    MODEL_GATHER_FALLBACK,
    filter_output,
    is_crisis,
    looks_malformed,
)
from services.summarizer import summarize_session


class SessionServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def remaining_seconds(session: CounselingSession, now: datetime | None = None) -> int:
    if not session.started_at:
        return session.duration_target_sec
    current = now or datetime.now(UTC)
    started = datetime.fromisoformat(session.started_at.replace("Z", "+00:00"))
    elapsed = int((current - started).total_seconds())
    return max(0, session.duration_target_sec - elapsed)


async def start_session(db: Session, session_id: str) -> dict:
    from services.scheduler import can_join

    session = db.get(CounselingSession, session_id)
    if not session:
        raise SessionServiceError("Session not found", 404)
    if session.status == "ended":
        raise SessionServiceError("Session already ended", 400)
    if session.status == "crisis":
        raise SessionServiceError("Session closed due to crisis", 403)
    if session.scheduled_at and not can_join(session.scheduled_at):
        raise SessionServiceError(
            "Join window is T-5 to T+15 minutes around the booked start.",
            403,
        )

    session.status = "active"
    session.started_at = utc_now_iso()
    opening = await _opening_message(db, session.user_id)
    db.add(
        Message(
            id=new_id(),
            session_id=session.id,
            role="assistant",
            content=opening,
            created_at=utc_now_iso(),
        )
    )
    db.commit()
    return {
        "session_id": session.id,
        "opening_message": opening,
        "duration_target_sec": session.duration_target_sec,
        "clinical_context_loaded": True,
    }


async def chat_turn(db: Session, session_id: str, content: str) -> dict:
    session = db.get(CounselingSession, session_id)
    if not session:
        raise SessionServiceError("Session not found", 404)
    if session.status != "active":
        raise SessionServiceError("Session is not active", 400)

    remaining = remaining_seconds(session)
    now = utc_now_iso()
    db.add(
        Message(
            id=new_id(),
            session_id=session.id,
            role="user",
            content=content,
            created_at=now,
        )
    )
    db.flush()

    # Distress/self-harm no longer hard-stops the session. We log it for the
    # clinical record, then let the counselor stay present and respond with a
    # safety-aware, therapist-style approach (guidance injected below).
    crisis_signal = is_crisis(content)
    if crisis_signal:
        db.add(
            SafetyEvent(
                session_id=session.id,
                user_id=session.user_id,
                event_type="crisis_input",
                trigger_source=content[:500],
                created_at=now,
            )
        )

    history = db.scalars(
        select(Message)
        .where(Message.session_id == session.id)
        .order_by(Message.created_at.asc(), Message.id.asc())
    ).all()
    prior = [
        {"role": m.role, "content": m.content}
        for m in history
        if m.role in {"user", "assistant"} and m.content != content
    ]
    # Always end with the current user turn (avoids empty history / flush races).
    turns = [*prior, {"role": "user", "content": content}][-20:]

    memory = build_memory_block_for_user(db, session.user_id)
    # Llama chat templates expect the first non-system turn to be user.
    opening_bits: list[str] = []
    while turns and turns[0]["role"] == "assistant":
        opening_bits.append(turns.pop(0)["content"])
    if opening_bits:
        memory = (
            f"{memory}\n\n[ALREADY SAID TO CLIENT]\n" + "\n".join(opening_bits)
        )

    wrap_hint = None
    if remaining < 300:
        wrap_hint = (
            "Less than 5 minutes remain. Begin wrapping up: brief summary and one "
            "concrete homework step."
        )

    system_extra = memory
    if wrap_hint:
        system_extra = f"{system_extra}\n\n[SESSION TIMER]\n{wrap_hint}"
    if crisis_signal:
        system_extra = f"{system_extra}\n\n{CRISIS_CARE_HINT}"

    if not turns or turns[-1]["role"] != "user":
        raise SessionServiceError("No user message to respond to", 400)

    try:
        reply = await ollama_chat(turns, system_extra=system_extra)
        # Never surface garbled output. Retry once, then hold with a warm line.
        if looks_malformed(reply):
            reply = await ollama_chat(turns, system_extra=system_extra)
            if looks_malformed(reply):
                db.add(
                    SafetyEvent(
                        session_id=session.id,
                        user_id=session.user_id,
                        event_type="output_malformed",
                        trigger_source=reply[:500],
                        created_at=utc_now_iso(),
                    )
                )
                reply = MODEL_GATHER_FALLBACK
    except OllamaError as exc:
        db.rollback()
        raise SessionServiceError(str(exc), 503) from exc

    filtered = filter_output(reply)
    if filtered != reply:
        db.add(
            SafetyEvent(
                session_id=session.id,
                user_id=session.user_id,
                event_type="output_blocked",
                trigger_source=reply[:500],
                created_at=utc_now_iso(),
            )
        )
        reply = filtered

    db.add(
        Message(
            id=new_id(),
            session_id=session.id,
            role="assistant",
            content=reply,
            created_at=utc_now_iso(),
        )
    )
    db.commit()
    return {
        "reply": reply,
        # No hard redirect — the counselor handles distress in-session.
        "crisis": False,
        "expression": avatar_hints.from_text(reply, crisis=crisis_signal),
        "remaining_sec": remaining_seconds(session),
    }


async def close_session(db: Session, session_id: str, mood_end: int | None) -> dict:
    from db.models import Booking

    session = db.get(CounselingSession, session_id)
    if not session:
        raise SessionServiceError("Session not found", 404)

    history = db.scalars(
        select(Message)
        .where(Message.session_id == session.id)
        .order_by(Message.created_at.asc())
    ).all()
    transcript = [{"role": m.role, "content": m.content} for m in history]
    notes = await summarize_session(transcript)

    session.status = "ended"
    session.ended_at = utc_now_iso()
    note = db.get(SessionNote, session.id)
    if note is None:
        note = SessionNote(session_id=session.id, summary="", created_at=utc_now_iso())
        db.add(note)
    note.summary = notes["summary"]
    note.homework = notes["homework"]
    note.techniques_used = notes["techniques_used"]
    note.mood_end = mood_end
    note.created_at = utc_now_iso()

    if session.booking_id:
        booking = db.get(Booking, session.booking_id)
        if booking:
            booking.status = "completed"

    profile = db.get(UserProfile, session.user_id)
    if profile:
        profile.clinical_summary = notes["summary"]
        profile.updated_at = utc_now_iso()

    db.commit()
    return {
        "session_id": session.id,
        "summary": notes["summary"],
        "homework": notes["homework"],
        "techniques_used": notes["techniques_used"],
        "status": "ended",
    }


async def _opening_message(db: Session, user_id: str) -> str:
    from db.models import SessionNote, User

    user = db.get(User, user_id)
    profile = db.get(UserProfile, user_id)
    name = (user.display_name if user and user.display_name else "").strip()
    greeting = f"Hi {name}, " if name else "Hi, "
    goal = profile.session_goal if profile and profile.session_goal else None

    session_ids = db.scalars(
        select(CounselingSession.id).where(CounselingSession.user_id == user_id)
    ).all()
    last_note = None
    if session_ids:
        last_note = db.scalars(
            select(SessionNote)
            .where(SessionNote.session_id.in_(session_ids))
            .order_by(SessionNote.created_at.desc())
        ).first()

    if last_note:
        snippet = last_note.summary[:180].rstrip(".")
        homework = (last_note.homework or "that small practice").strip()
        return (
            f"{greeting}good to see you again. Last time we touched on {snippet}. "
            f"How did {homework} go for you?"
        )
    if goal:
        return (
            f"{greeting}I'm really glad you made it. You mentioned wanting to work on {goal} — "
            "where would you like to begin today?"
        )
    return (
        f"{greeting}I'm glad you're here. Take a breath — whenever you're ready, "
        "what's been sitting with you?"
    )
