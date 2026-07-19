from __future__ import annotations

import re

Expression = str  # calm | attentive | concerned | warm


def from_text(reply: str, *, crisis: bool = False) -> Expression:
    if crisis:
        return "concerned"

    lower = reply.lower()
    if any(token in lower for token in ("understand", "hear you", "glad you", "with you")):
        return "warm"
    if "?" in reply:
        return "attentive"
    if re.search(r"\b(hard|heavy|painful|difficult)\b", lower):
        return "concerned"
    return "calm"
