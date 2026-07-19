from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from db.models import CounselingSession, Message, SafetyEvent, SessionNote, User, UserProfile
from services import avatar_hints
from services.ids import new_id, utc_now_iso
from services.locales import language_instruction, normalize_locale
from services.memory import build_memory_block_for_user
from services.ollama_client import (
    MAX_CONTEXT_MESSAGES,
    OllamaError,
    chat as ollama_chat,
    trim_messages,
)
from services.safety import (
    CRISIS_CARE_HINT,
    coerce_reply_language,
    crisis_fallback,
    filter_output,
    gather_fallback,
    grounded_fallback,
    is_crisis,
    looks_malformed,
    looks_ungrounded,
    looks_wrong_language,
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


_COMPANION_NAMES = {"hop": "Milo", "aura": "Coco", "spark": "Ziggy"}


async def start_session(
    db: Session,
    session_id: str,
    *,
    avatar_id: str | None = None,
) -> dict:
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
            "You can join from 5 minutes before your booked time "
            "until 15 minutes after it. Please come back closer to your slot, "
            "or book a new one / start a practice session from Home.",
            403,
        )

    # Idempotent: React Strict Mode / effect re-runs must not create a second opening.
    # TTS is still attached by the router so the surviving mount can speak the intro.
    if session.status == "active" and session.started_at:
        first = db.scalars(
            select(Message)
            .where(Message.session_id == session.id, Message.role == "assistant")
            .order_by(Message.created_at.asc(), Message.id.asc())
        ).first()
        opening = (
            first.content
            if first
            else await _opening_message(db, session.user_id, avatar_id=avatar_id)
        )
        if not first:
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
            "already_active": True,
        }

    session.status = "active"
    session.started_at = utc_now_iso()
    opening = await _opening_message(db, session.user_id, avatar_id=avatar_id)
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
        "already_active": False,
    }


async def chat_turn(
    db: Session,
    session_id: str,
    content: str,
    *,
    detected_language: str | None = None,
) -> dict:
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

    # Log distress for the record; stay in-session (guidance injected below).
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

    # Persist the user turn before the LLM call so a slow/failed model
    # cannot wipe what they said via rollback.
    db.commit()

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
    # Current user turn last; cap context length for prompt latency.
    turns = trim_messages(
        [*prior, {"role": "user", "content": content}],
        MAX_CONTEXT_MESSAGES,
    )

    memory = build_memory_block_for_user(db, session.user_id)
    # Llama expects first non-system turn to be user; fold leftover openings into memory.
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

    user = db.get(User, session.user_id)
    # Reply language is LOCKED to the session preference (avatar picker locale).
    # Whisper may detect en/ur/hi for STT only — never flip Hindi session → English.
    locale = normalize_locale(user.locale if user else None)
    _ = detected_language  # kept for API/logging; does not choose reply language

    system_extra = memory
    system_extra = f"{system_extra}\n\n{language_instruction(locale)}"
    system_extra = (
        f"{system_extra}\n\n[THIS TURN — GROUNDING]\n"
        f"Client just said (exact): {content[:500]}\n"
        "Your reply MUST reflect this specific content. "
        "Do not invent a different topic (e.g. do not turn a breakup into "
        "'a bad year'). Never say 'this is good stuff'."
    )
    if wrap_hint:
        system_extra = f"{system_extra}\n\n[SESSION TIMER]\n{wrap_hint}"
    if crisis_signal:
        system_extra = f"{system_extra}\n\n{CRISIS_CARE_HINT}"

    if not turns or turns[-1]["role"] != "user":
        raise SessionServiceError("No user message to respond to", 400)

    def _fallback_reply() -> str:
        if crisis_signal:
            return crisis_fallback(locale)
        return grounded_fallback(content, locale) or gather_fallback(locale)

    def _bad_reply(text: str) -> bool:
        return (
            looks_malformed(text)
            or looks_ungrounded(content, text)
            or looks_wrong_language(text, locale)
        )

    try:
        reply = await ollama_chat(turns, system_extra=system_extra)
        # Never surface garbled or off-topic invented replies.
        if _bad_reply(reply):
            reply = await ollama_chat(turns, system_extra=system_extra)
            if _bad_reply(reply):
                db.add(
                    SafetyEvent(
                        session_id=session.id,
                        user_id=session.user_id,
                        event_type="output_malformed",
                        trigger_source=reply[:500],
                        created_at=utc_now_iso(),
                    )
                )
                reply = _fallback_reply()
    except OllamaError:
        # Prefer a caring reply over a blank "thinking" / 503 wall.
        db.add(
            SafetyEvent(
                session_id=session.id,
                user_id=session.user_id,
                event_type="model_unavailable",
                trigger_source=content[:500],
                created_at=utc_now_iso(),
            )
        )
        reply = _fallback_reply()

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
    # Drop English↔Hindi side-by-side dumps (sounds like double / translated voice).
    reply = coerce_reply_language(reply, locale)

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


async def _opening_message(
    db: Session,
    user_id: str,
    *,
    avatar_id: str | None = None,
) -> str:
    from db.models import SessionNote

    user = db.get(User, user_id)
    profile = db.get(UserProfile, user_id)
    name = (user.display_name if user and user.display_name else "").strip()
    locale = normalize_locale(user.locale if user else None)
    companion = _COMPANION_NAMES.get(avatar_id or "")
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
        return _localized_return_opening(locale, name, snippet, homework, companion)
    if goal:
        return _localized_goal_opening(locale, name, goal, companion)
    return _localized_fresh_opening(locale, name, companion)


def _localized_fresh_opening(locale: str, name: str, companion: str | None = None) -> str:
    _ = locale
    greet = f"Hey {name}, " if name else "Hey, "
    if companion:
        return (
            f"{greet}I'm {companion} — your companion for this chat. "
            "I'm glad you're here. Whenever you're ready, what's been sitting with you?"
        )
    return (
        f"{greet}I'm glad you're here. Whenever you're ready — "
        "what's been sitting with you?"
    )


def _localized_goal_opening(
    locale: str,
    name: str,
    goal: str,
    companion: str | None = None,
) -> str:
    _ = locale
    greet = f"Hey {name}, " if name else "Hey, "
    if companion:
        return (
            f"{greet}I'm {companion}. Nice that you made it. "
            f"You wanted to work on {goal} — where would you like to begin today?"
        )
    return (
        f"{greet}nice that you made it. You wanted to work on {goal} — "
        "where would you like to begin today?"
    )


def _localized_return_opening(
    locale: str,
    name: str,
    snippet: str,
    homework: str,
    companion: str | None = None,
) -> str:
    _ = locale
    greet = f"Hey {name}, " if name else "Hey, "
    who = f"I'm {companion}. " if companion else ""
    return (
        f"{greet}{who}Good to see you again. Last time we touched on {snippet}. "
        f"How did {homework} go for you?"
    )
