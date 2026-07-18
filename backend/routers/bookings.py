from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from db.models import Booking, CounselingSession, User
from db.session import get_db
from services.ids import new_id, utc_now_iso
from services.scheduler import can_cancel, generate_slots, parse_iso, to_iso
from datetime import timedelta

router = APIRouter(prefix="/api/v1/bookings", tags=["bookings"])


class BookRequest(BaseModel):
    user_id: str
    slot_start: str


@router.get("/slots")
def list_slots(
    from_date: str | None = Query(default=None, alias="from"),
    timezone: str = Query(default="Asia/Kolkata"),
    db: Session = Depends(get_db),
):
    day = date.fromisoformat(from_date) if from_date else date.today()
    booked = {
        b.slot_start
        for b in db.scalars(
            select(Booking).where(Booking.status == "booked")
        ).all()
    }
    return {"slots": generate_slots(from_day=day, timezone_name=timezone, booked_starts=booked)}


@router.get("")
def list_bookings(user_id: str, db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Booking).where(Booking.user_id == user_id).order_by(Booking.slot_start.asc())
    ).all()
    sessions = {
        s.booking_id: s.id
        for s in db.scalars(select(CounselingSession).where(CounselingSession.user_id == user_id)).all()
        if s.booking_id
    }
    return {
        "bookings": [
            {
                "booking_id": b.id,
                "session_id": sessions.get(b.id),
                "slot_start": b.slot_start,
                "slot_end": b.slot_end,
                "status": b.status,
            }
            for b in rows
        ]
    }


@router.post("")
def create_booking(body: BookRequest, db: Session = Depends(get_db)):
    user = db.get(User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.scalars(
        select(Booking).where(Booking.slot_start == body.slot_start, Booking.status == "booked")
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Slot already booked")

    start = parse_iso(body.slot_start)
    end = start + timedelta(seconds=settings.session_duration_sec)
    booking_id = new_id()
    session_id = new_id()
    now = utc_now_iso()

    booking = Booking(
        id=booking_id,
        user_id=body.user_id,
        slot_start=to_iso(start),
        slot_end=to_iso(end),
        status="booked",
        created_at=now,
    )
    session = CounselingSession(
        id=session_id,
        user_id=body.user_id,
        booking_id=booking_id,
        status="scheduled",
        scheduled_at=to_iso(start),
        duration_target_sec=settings.session_duration_sec,
    )
    db.add(booking)
    db.add(session)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slot already booked") from exc

    return {
        "booking_id": booking_id,
        "session_id": session_id,
        "slot_start": booking.slot_start,
        "slot_end": booking.slot_end,
        "status": "booked",
    }


@router.delete("/{booking_id}")
def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "booked":
        raise HTTPException(status_code=400, detail="Booking is not cancellable")
    if not can_cancel(booking.slot_start):
        raise HTTPException(
            status_code=400,
            detail="Cancellations only allowed at least 24 hours before start",
        )

    booking.status = "cancelled"
    session = db.scalars(
        select(CounselingSession).where(CounselingSession.booking_id == booking_id)
    ).first()
    if session and session.status == "scheduled":
        session.status = "ended"
        session.ended_at = utc_now_iso()
    db.commit()
    return {"booking_id": booking_id, "status": "cancelled"}
