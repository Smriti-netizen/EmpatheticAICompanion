from __future__ import annotations

import base64
import logging

from sqlalchemy.orm import Session

from db.models import CounselingSession, User, UserProfile
from services import tts
from services.ids import utc_now_iso
from services.locales import normalize_locale

logger = logging.getLogger(__name__)

_VALID_AVATARS = frozenset({"hop", "aura", "spark"})


def voice_profile_for_session(db: Session, session_id: str) -> tuple[str | None, str | None]:
    """Return (avatar_id, locale). Locale lives on User, not UserProfile."""
    session = db.get(CounselingSession, session_id)
    if not session:
        return None, None
    profile = db.get(UserProfile, session.user_id)
    user = db.get(User, session.user_id)
    avatar_id = profile.avatar_id if profile else None
    locale = normalize_locale(user.locale if user else None)
    return avatar_id, locale


def voice_key_for_session(db: Session, session_id: str) -> str | None:
    key, _ = voice_profile_for_session(db, session_id)
    return key


def sync_session_voice_prefs(
    db: Session,
    session_id: str,
    avatar_id: str | None = None,
    locale: str | None = None,
) -> tuple[str | None, str | None]:
    """Update avatar/locale from the client, then return voice prefs for TTS.

    If SQLite is locked, still return the *requested* avatar so Coco never
    falls back to a stale Milo/Ziggy male voice for this turn.
    """
    session = db.get(CounselingSession, session_id)
    if not session:
        return None, None

    user = db.get(User, session.user_id)
    profile = db.get(UserProfile, session.user_id)
    now = utc_now_iso()
    dirty = False
    requested = avatar_id if avatar_id in _VALID_AVATARS else None
    requested_locale = normalize_locale(locale) if locale else None

    if requested:
        if not profile:
            profile = UserProfile(
                user_id=session.user_id,
                primary_concerns="[]",
                triggers_avoid="[]",
                updated_at=now,
            )
            db.add(profile)
        if profile.avatar_id != requested:
            profile.avatar_id = requested
            profile.updated_at = now
            dirty = True

    if requested_locale and user and user.locale != requested_locale:
        user.locale = requested_locale
        dirty = True

    if dirty:
        try:
            db.commit()
        except Exception as exc:
            logger.warning(
                "Voice pref persist failed (using in-request avatar=%s): %s",
                requested,
                exc,
            )
            try:
                db.rollback()
            except Exception:
                pass

    # Prefer this request's companion over a stale DB row.
    if requested:
        loc = requested_locale or (
            normalize_locale(user.locale if user else None)
        )
        return requested, loc

    return voice_profile_for_session(db, session_id)


async def attach_tts(
    payload: dict,
    text: str | None = None,
    voice_key: str | None = None,
    locale: str | None = None,
) -> dict:
    spoken = (text or payload.get("reply") or payload.get("opening_message") or "").strip()
    payload.setdefault("audio_base64", None)
    payload.setdefault("audio_mime", "audio/wav")
    payload["avatar_id"] = voice_key
    payload["locale"] = locale
    payload["tts_voice"] = None
    if not spoken or payload.get("crisis"):
        return payload
    if tts.status() != "ready":
        return payload
    try:
        voice_name = tts.resolve_voice_name(spoken, voice_key, locale=locale)
        payload["tts_voice"] = voice_name
        logger.info(
            "TTS persona=%s locale=%s voice=%s chars=%d",
            voice_key,
            locale,
            voice_name,
            len(spoken),
        )
        audio, mime = await tts.synthesize_async(spoken, voice_key, locale=locale)
        payload["audio_base64"] = base64.b64encode(audio).decode("ascii")
        payload["audio_mime"] = mime
    except Exception as exc:
        logger.warning("TTS failed (persona=%s): %s", voice_key, exc)
        payload["audio_base64"] = None
    return payload
