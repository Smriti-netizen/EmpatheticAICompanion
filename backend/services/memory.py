"""Build chart memory block for prompt injection."""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import Screening, SessionNote, UserProfile


def build_memory_block(db: Session, user_id: str) -> str:
    profile = db.get(UserProfile, user_id)
    lines = ["[CLIENT CHART — not shown to user]"]

    if profile:
        concerns = _load_json_list(profile.primary_concerns)
        if concerns:
            lines.append(f"Primary concerns: {', '.join(concerns)}")
        if profile.session_goal:
            lines.append(f"Goals: {profile.session_goal}")
        if profile.clinical_summary:
            lines.append(f"Clinical summary: {profile.clinical_summary}")
        if profile.triggers_avoid:
            triggers = _load_json_list(profile.triggers_avoid)
            if triggers:
                lines.append(f"Avoid: {', '.join(triggers)}")

    screenings = db.scalars(
        select(Screening)
        .where(Screening.user_id == user_id)
        .order_by(Screening.taken_at.desc())
    ).all()
    latest_phq = next((s for s in screenings if s.instrument == "PHQ9"), None)
    latest_gad = next((s for s in screenings if s.instrument == "GAD7"), None)
    if latest_phq:
        lines.append(f"Latest PHQ-9: {latest_phq.score} ({latest_phq.taken_at[:10]})")
    if latest_gad:
        lines.append(f"Latest GAD-7: {latest_gad.score} ({latest_gad.taken_at[:10]})")

    notes = db.scalars(
        select(SessionNote).order_by(SessionNote.created_at.desc())
    ).all()
    # Filter by joining sessions would be better; use notes linked via session user later.
    # For MVP: look up notes for this user's sessions in the caller when needed.
    _ = notes

    return "\n".join(lines)


def build_memory_block_for_user(db: Session, user_id: str) -> str:
    base = build_memory_block(db, user_id)

    from db.models import CounselingSession

    session_ids = db.scalars(
        select(CounselingSession.id).where(CounselingSession.user_id == user_id)
    ).all()
    if not session_ids:
        return base

    note = db.scalars(
        select(SessionNote)
        .where(SessionNote.session_id.in_(session_ids))
        .order_by(SessionNote.created_at.desc())
    ).first()
    if not note:
        return base

    extra = [
        f"Last session summary: {note.summary}",
        f"Pending homework: {note.homework or 'none'}",
    ]
    # Keep techniques internal only — never phrase as labels the model might echo aloud.
    if note.techniques_used:
        extra.append(
            f"Approaches that seemed useful last time (do not name these to the client): "
            f"{note.techniques_used}"
        )
    return base + "\n" + "\n".join(extra)


def _load_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return [str(item) for item in data] if isinstance(data, list) else []
