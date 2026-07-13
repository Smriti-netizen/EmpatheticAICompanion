"""End-to-end API flow test for Empathic Companion."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import date

BASE = "http://127.0.0.1:8000"


def call(method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if body is not None else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise AssertionError(f"{method} {path} -> {exc.code}: {detail}") from exc


def main() -> int:
    health = call("GET", "/api/v1/health")
    assert health.get("api") == "up", health
    assert health.get("model_loaded") is True, health
    print("OK health")

    user = call(
        "POST",
        "/api/v1/users",
        {"display_name": "E2E", "age": 28, "consent_version": "2026-07-01"},
    )
    uid = user["user_id"]
    print("OK user", uid)

    intake = call(
        "PUT",
        f"/api/v1/users/{uid}/intake",
        {
            "primary_concerns": ["anxiety", "sleep"],
            "session_goal": "feel calmer at night",
            "crisis_screen_positive": False,
            "duration_problem": "a few months",
            "prior_therapy": False,
            "clinical_summary": "E2E intake summary",
        },
    )
    assert intake["crisis_screen_positive"] is False
    print("OK intake")

    call(
        "PUT",
        f"/api/v1/users/{uid}/avatar",
        {"avatar_id": "hop"},
    )
    print("OK avatar")

    phq = call(
        "POST",
        f"/api/v1/users/{uid}/screenings",
        {"instrument": "PHQ9", "items": [1, 1, 0, 1, 0, 0, 1, 0, 0]},
    )
    assert phq["score"] == 4
    gad = call(
        "POST",
        f"/api/v1/users/{uid}/screenings",
        {"instrument": "GAD7", "items": [1, 1, 1, 0, 0, 1, 0]},
    )
    assert gad["score"] == 4
    print("OK screenings")

    slots = call("GET", f"/api/v1/bookings/slots?from={date.today().isoformat()}&timezone=Asia/Kolkata")
    available = [s for s in slots["slots"] if s["available"]]
    assert available, "expected open slots"
    booked = call(
        "POST",
        "/api/v1/bookings",
        {"user_id": uid, "slot_start": available[0]["start"]},
    )
    assert booked["status"] == "booked"
    print("OK booking", booked["booking_id"])

    practice = call("POST", "/api/v1/sessions/practice", {"user_id": uid})
    sid = practice["session_id"]
    started = call("POST", f"/api/v1/sessions/{sid}/start")
    assert started["opening_message"]
    print("OK start")

    chat = call(
        "POST",
        f"/api/v1/sessions/{sid}/chat",
        {"content": "I have been feeling tense before sleep."},
    )
    assert chat["crisis"] is False
    assert chat["reply"]
    print("OK chat")

    crisis = call(
        "POST",
        f"/api/v1/sessions/{sid}/chat",
        {"content": "I want to kill myself"},
    )
    assert crisis["crisis"] is True
    print("OK crisis gate")

    # New session for close path (previous may be crisis)
    practice2 = call("POST", "/api/v1/sessions/practice", {"user_id": uid})
    sid2 = practice2["session_id"]
    call("POST", f"/api/v1/sessions/{sid2}/start")
    call(
        "POST",
        f"/api/v1/sessions/{sid2}/chat",
        {"content": "Work has been overwhelming lately."},
    )
    closed = call("POST", f"/api/v1/sessions/{sid2}/close", {"mood_end": 3})
    assert closed["status"] == "ended"
    assert closed["summary"]
    print("OK close")

    resources = call("GET", "/api/v1/crisis/resources")
    assert resources["helplines"]
    print("OK crisis resources")

    print("\nALL E2E API CHECKS PASSED")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nFAILED: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
