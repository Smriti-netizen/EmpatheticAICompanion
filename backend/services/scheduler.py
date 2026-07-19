from __future__ import annotations

from datetime import UTC, date, datetime, timedelta, timezone

from config import settings

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore[misc, assignment]


def _resolve_tz(timezone_name: str) -> timezone:
    if ZoneInfo is not None:
        try:
            return ZoneInfo(timezone_name)  # type: ignore[return-value]
        except Exception:
            pass
    # Windows without tzdata — IST fallback for India MVP
    if timezone_name in {"Asia/Kolkata", "Asia/Calcutta", "IST"}:
        return timezone(timedelta(hours=5, minutes=30))
    return UTC


def parse_iso(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_iso(dt: datetime) -> str:
    return dt.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def generate_slots(
    *,
    from_day: date,
    timezone_name: str = "Asia/Kolkata",
    days: int = 14,
    booked_starts: set[str] | None = None,
) -> list[dict]:
    booked = booked_starts or set()
    tz = _resolve_tz(timezone_name)
    duration = timedelta(seconds=settings.session_duration_sec)
    step = duration + timedelta(minutes=settings.session_buffer_min)
    now = datetime.now(UTC)
    slots: list[dict] = []

    for offset in range(days):
        local_day = datetime(
            from_day.year,
            from_day.month,
            from_day.day,
            tzinfo=tz,
        ) + timedelta(days=offset)
        cursor = local_day.replace(hour=9, minute=0, second=0, microsecond=0)
        day_end = local_day.replace(hour=21, minute=0, second=0, microsecond=0)

        while cursor + duration <= day_end:
            start_utc = cursor.astimezone(UTC)
            end_utc = (cursor + duration).astimezone(UTC)
            start_iso = to_iso(start_utc)
            if start_utc > now:
                slots.append(
                    {
                        "start": start_iso,
                        "end": to_iso(end_utc),
                        "available": start_iso not in booked,
                    }
                )
            cursor += step

    return slots


def can_join(scheduled_at: str, now: datetime | None = None) -> bool:
    current = now or datetime.now(UTC)
    start = parse_iso(scheduled_at)
    earliest = start - timedelta(minutes=settings.session_join_early_min)
    latest = start + timedelta(minutes=settings.session_join_late_min)
    return earliest <= current <= latest


def can_cancel(slot_start: str, now: datetime | None = None) -> bool:
    current = now or datetime.now(UTC)
    start = parse_iso(slot_start)
    return start - current >= timedelta(hours=24)
