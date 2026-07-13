from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config import settings
from db.session import get_db
from db.models import User
from services.ids import new_id, utc_now_iso

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class CreateUserRequest(BaseModel):
    display_name: str | None = None
    locale: str = "en-IN"
    age: int | None = Field(default=None, ge=13, le=120)
    consent_version: str | None = None


@router.post("")
def create_user(body: CreateUserRequest, db: Session = Depends(get_db)):
    user_id = new_id()
    now = utc_now_iso()
    user = User(
        id=user_id,
        display_name=body.display_name,
        locale=body.locale,
        age=body.age,
        consent_version=body.consent_version or settings.consent_version,
        consent_at=now,
        created_at=now,
    )
    db.add(user)
    db.commit()
    return {
        "user_id": user.id,
        "display_name": user.display_name,
        "locale": user.locale,
        "age": user.age,
        "consent_version": user.consent_version,
        "consent_at": user.consent_at,
        "created_at": user.created_at,
    }
