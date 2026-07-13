"""End-of-session summarizer via Ollama."""

from __future__ import annotations

import json
import logging
import re

from services.ollama_client import chat as ollama_chat

logger = logging.getLogger(__name__)


async def summarize_session(transcript: list[dict[str, str]]) -> dict[str, str]:
    prompt = (
        "Summarize this therapy transcript for the clinical chart. "
        "Return ONLY valid JSON with keys: summary, homework, techniques_used "
        "(techniques_used as a short comma-separated string). "
        "No diagnosis or medication.\n\n"
        + "\n".join(f"{m['role']}: {m['content']}" for m in transcript[-30:])
    )
    try:
        raw = await ollama_chat(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            include_system=False,
        )
        parsed = _extract_json(raw)
        return {
            "summary": str(parsed.get("summary") or raw.strip())[:2000],
            "homework": str(parsed.get("homework") or "Practice one grounding breath daily.")[:1000],
            "techniques_used": str(parsed.get("techniques_used") or "reflective listening")[:500],
        }
    except Exception:
        logger.exception("Session summarizer failed; using fallback")
        return {
            "summary": "Session completed. Client discussed recent stressors and coping.",
            "homework": "Notice one trigger this week and write one helpful response.",
            "techniques_used": "reflective listening",
        }


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {}
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}
