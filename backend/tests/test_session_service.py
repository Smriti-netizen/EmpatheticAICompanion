from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from db.base import Base
from db.models import CounselingSession, Message, SafetyEvent, User, UserProfile
from services.ids import new_id, utc_now_iso
from services.session_service import chat_turn, close_session, start_session


@pytest.fixture
def db(tmp_path):
    path = tmp_path / "session_test.db"
    engine = create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _seed_user_and_session(db):
    user_id = new_id()
    session_id = new_id()
    now = utc_now_iso()
    db.add(
        User(
            id=user_id,
            display_name="Test",
            locale="en-IN",
            consent_version="test",
            consent_at=now,
            created_at=now,
        )
    )
    db.add(
        UserProfile(
            user_id=user_id,
            primary_concerns="[]",
            session_goal="sleep",
            triggers_avoid="[]",
            avatar_id="aura",
            updated_at=now,
        )
    )
    db.add(
        CounselingSession(
            id=session_id,
            user_id=user_id,
            booking_id=None,
            status="scheduled",
            scheduled_at=now,
            duration_target_sec=1800,
        )
    )
    db.commit()
    return user_id, session_id


@pytest.mark.asyncio
async def test_start_chat_close_happy_path(db):
    _user_id, session_id = _seed_user_and_session(db)

    started = await start_session(db, session_id)
    assert started["session_id"] == session_id
    assert started["opening_message"]
    row = db.get(CounselingSession, session_id)
    assert row is not None and row.status == "active"

    with patch(
        "services.session_service.ollama_chat",
        new=AsyncMock(return_value="I hear how heavy that feels. What would help tonight?"),
    ):
        turn = await chat_turn(db, session_id, "I've been exhausted lately.")
    assert "heavy" in turn["reply"].lower() or "hear" in turn["reply"].lower()
    assert turn["crisis"] is False

    msgs = db.scalars(
        select(Message).where(Message.session_id == session_id)
    ).all()
    assert any(m.role == "user" for m in msgs)
    assert any(m.role == "assistant" for m in msgs)

    with patch(
        "services.session_service.summarize_session",
        new=AsyncMock(
            return_value={
                "summary": "Talked about exhaustion.",
                "homework": "Try a 5-minute wind-down.",
                "techniques_used": "validation",
            }
        ),
    ):
        closed = await close_session(db, session_id, mood_end=3)
    assert closed["status"] == "ended"
    assert closed["homework"]
    assert db.get(CounselingSession, session_id).status == "ended"


@pytest.mark.asyncio
async def test_crisis_input_logs_safety_event(db):
    _user_id, session_id = _seed_user_and_session(db)
    await start_session(db, session_id)

    with patch(
        "services.session_service.ollama_chat",
        new=AsyncMock(return_value="I'm really glad you told me. Are you safe right now?"),
    ):
        await chat_turn(db, session_id, "I want to end my life")

    events = db.scalars(select(SafetyEvent)).all()
    assert any(e.event_type == "crisis_input" for e in events)
