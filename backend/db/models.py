from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    locale: Mapped[str] = mapped_column(String, nullable=False, default="en-IN")
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    consent_version: Mapped[str] = mapped_column(String, nullable=False)
    consent_at: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    primary_concerns: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    session_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    crisis_screen_positive: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_problem: Mapped[str | None] = mapped_column(Text, nullable=True)
    prior_therapy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_meds_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    support_person: Mapped[str | None] = mapped_column(Text, nullable=True)
    triggers_avoid: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    clinical_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_id: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)


class Screening(Base):
    __tablename__ = "screenings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    instrument: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    items: Mapped[str] = mapped_column(Text, nullable=False)
    taken_at: Mapped[str] = mapped_column(String, nullable=False)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (UniqueConstraint("slot_start", name="uq_bookings_slot_start"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    slot_start: Mapped[str] = mapped_column(String, nullable=False)
    slot_end: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class CounselingSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    booking_id: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    scheduled_at: Mapped[str | None] = mapped_column(String, nullable=True)
    started_at: Mapped[str | None] = mapped_column(String, nullable=True)
    ended_at: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_target_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=2700)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class SessionNote(Base):
    __tablename__ = "session_notes"

    session_id: Mapped[str] = mapped_column(String, primary_key=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    homework: Mapped[str | None] = mapped_column(Text, nullable=True)
    techniques_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    trigger_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
