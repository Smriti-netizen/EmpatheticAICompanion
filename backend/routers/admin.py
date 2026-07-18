from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import SafetyEvent
from db.session import get_db

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/safety-events")
def list_safety_events(db: Session = Depends(get_db)):
    """Local-only visibility into crisis / safety flags. Do not expose publicly without auth."""
    events = db.scalars(
        select(SafetyEvent).order_by(SafetyEvent.created_at.desc()).limit(100)
    ).all()
    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "session_id": e.session_id,
            "event_type": e.event_type,
            "trigger_source": e.trigger_source,
            "created_at": e.created_at,
        }
        for e in events
    ]
