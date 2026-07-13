import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.models import Screening, User, UserProfile
from db.session import get_db
from services.ids import new_id, utc_now_iso
from services.scoring import score_items, validate_screening_items

router = APIRouter(prefix="/api/v1/users", tags=["intake"])


class IntakeRequest(BaseModel):
    primary_concerns: list[str] = Field(default_factory=list)
    session_goal: str | None = None
    crisis_screen_positive: bool = False
    duration_problem: str | None = None
    prior_therapy: bool | None = None
    current_meds_note: str = ""
    support_person: str | None = None
    triggers_avoid: list[str] = Field(default_factory=list)
    avatar_id: str | None = None
    clinical_summary: str | None = None


class ScreeningRequest(BaseModel):
    instrument: str
    items: list[int]


class AvatarRequest(BaseModel):
    avatar_id: str = Field(pattern="^(hop|aura|spark)$")


@router.put("/{user_id}/intake")
def upsert_intake(user_id: str, body: IntakeRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = utc_now_iso()
    profile = db.get(UserProfile, user_id)
    if not profile:
        profile = UserProfile(user_id=user_id, updated_at=now)
        db.add(profile)

    profile.primary_concerns = json.dumps(body.primary_concerns)
    profile.session_goal = body.session_goal
    profile.crisis_screen_positive = 1 if body.crisis_screen_positive else 0
    profile.duration_problem = body.duration_problem
    profile.prior_therapy = None if body.prior_therapy is None else (1 if body.prior_therapy else 0)
    profile.current_meds_note = body.current_meds_note
    profile.support_person = body.support_person
    profile.triggers_avoid = json.dumps(body.triggers_avoid)
    if body.avatar_id is not None:
        profile.avatar_id = body.avatar_id
    if body.clinical_summary is not None:
        profile.clinical_summary = body.clinical_summary
    profile.updated_at = now
    db.commit()

    return {
        "user_id": user_id,
        "crisis_screen_positive": bool(profile.crisis_screen_positive),
        "session_goal": profile.session_goal,
        "primary_concerns": body.primary_concerns,
        "avatar_id": profile.avatar_id,
    }


@router.put("/{user_id}/avatar")
def set_avatar(user_id: str, body: AvatarRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = utc_now_iso()
    profile = db.get(UserProfile, user_id)
    if not profile:
        profile = UserProfile(user_id=user_id, primary_concerns="[]", triggers_avoid="[]", updated_at=now)
        db.add(profile)

    profile.avatar_id = body.avatar_id
    profile.updated_at = now
    db.commit()
    return {"user_id": user_id, "avatar_id": profile.avatar_id}


@router.post("/{user_id}/screenings")
def create_screening(user_id: str, body: ScreeningRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    instrument = body.instrument.upper().replace("-", "")
    if instrument == "PHQ-9":
        instrument = "PHQ9"
    if instrument == "GAD-7":
        instrument = "GAD7"

    try:
        validate_screening_items(instrument, body.items)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    score = score_items(body.items)
    screening = Screening(
        id=new_id(),
        user_id=user_id,
        instrument=instrument,
        score=score,
        items=json.dumps(body.items),
        taken_at=utc_now_iso(),
    )
    db.add(screening)

    # PHQ-9 item 9 (index 8): elevated self-harm ideation — log, don't auto-block.
    if instrument == "PHQ9" and len(body.items) >= 9 and body.items[8] >= 1:
        from db.models import SafetyEvent

        db.add(
            SafetyEvent(
                session_id=None,
                user_id=user_id,
                event_type="phq9_item9",
                trigger_source=f"item9={body.items[8]}",
                created_at=utc_now_iso(),
            )
        )

    db.commit()
    return {
        "id": screening.id,
        "instrument": instrument,
        "score": score,
        "items": body.items,
        "taken_at": screening.taken_at,
        "phq9_item9_flag": instrument == "PHQ9" and body.items[8] >= 1 if len(body.items) >= 9 else False,
    }
