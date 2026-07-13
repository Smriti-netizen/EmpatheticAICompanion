"""PHQ-9 / GAD-7 scoring helpers."""

from __future__ import annotations


def score_items(items: list[int]) -> int:
    return sum(items)


def phq9_band(score: int) -> str:
    if score <= 4:
        return "minimal"
    if score <= 9:
        return "mild"
    if score <= 14:
        return "moderate"
    if score <= 19:
        return "moderately severe"
    return "severe"


def gad7_band(score: int) -> str:
    if score <= 4:
        return "minimal"
    if score <= 9:
        return "mild"
    if score <= 14:
        return "moderate"
    return "severe"


def validate_screening_items(instrument: str, items: list[int]) -> None:
    expected = 9 if instrument == "PHQ9" else 7 if instrument == "GAD7" else None
    if expected is None:
        raise ValueError("instrument must be PHQ9 or GAD7")
    if len(items) != expected:
        raise ValueError(f"{instrument} requires {expected} items")
    if any(item < 0 or item > 3 for item in items):
        raise ValueError("each item must be an integer 0–3")
