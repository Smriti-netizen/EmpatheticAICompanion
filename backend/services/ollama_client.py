"""Ollama HTTP adapter — infrastructure only, no business rules."""

from __future__ import annotations

import logging

import httpx

from config import settings
from services.prompts import load_system_prompt

logger = logging.getLogger(__name__)

# Keep in sync with chat_service / session_service retry — do NOT retry here.
# Callers already retry once on malformed/empty output; a second layer here
# multiplies wall-clock wait (up to 4 full generations per user turn).
OLLAMA_TIMEOUT_SEC = 60.0
# Keep weights resident like `ollama run` does in a terminal session.
OLLAMA_KEEP_ALIVE = "60m"
# ~8–10 conversational turns (user + assistant messages).
MAX_CONTEXT_MESSAGES = 20


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an unexpected payload."""


def trim_messages(messages: list[dict], max_n: int = MAX_CONTEXT_MESSAGES) -> list[dict]:
    """Keep the newest messages and drop a leading orphan assistant turn."""
    trimmed = list(messages[-max_n:])
    while trimmed and trimmed[0].get("role") == "assistant":
        trimmed.pop(0)
    return trimmed


async def chat(
    messages: list[dict],
    temperature: float = 0.7,
    *,
    include_system: bool = True,
    system_extra: str | None = None,
) -> str:
    outbound: list[dict] = []
    if include_system:
        system = load_system_prompt()
        if system_extra:
            system = f"{system}\n\n{system_extra}"
        outbound.append({"role": "system", "content": system})
    outbound.extend(trim_messages(messages))

    payload = {
        "model": settings.ollama_model,
        "messages": outbound,
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
        "options": {"temperature": temperature, "num_predict": 220},
    }
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SEC) as client:
            response = await client.post(
                f"{settings.ollama_host}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.exception("Ollama chat request failed")
        raise OllamaError("Counselor model is temporarily unavailable.") from exc

    content = data.get("message", {}).get("content")
    # Empty/blank → return "" so callers can retry via looks_malformed.
    # Do not retry inside this adapter (avoids stacked retries).
    if not isinstance(content, str):
        return ""
    return content.strip()


def warm_model() -> bool:
    """Load the counselor weights into Ollama so the first user turn is not cold."""
    payload = {
        "model": settings.ollama_model,
        "messages": [{"role": "user", "content": "hi"}],
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
        "options": {"temperature": 0.0, "num_predict": 8},
    }
    try:
        with httpx.Client(timeout=180.0) as client:
            response = client.post(f"{settings.ollama_host}/api/chat", json=payload)
            response.raise_for_status()
        logger.info("Ollama model warm: %s", settings.ollama_model)
        return True
    except httpx.HTTPError as exc:
        logger.warning("Ollama warm-up failed: %s", exc)
        return False


async def health() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.ollama_host}/api/tags")
            response.raise_for_status()
            models = [m["name"] for m in response.json().get("models", [])]
    except httpx.HTTPError as exc:
        logger.exception("Ollama health check failed")
        raise OllamaError(str(exc)) from exc

    loaded = any(settings.ollama_model in name for name in models)
    return {"ollama": "up", "model_loaded": loaded, "models": models}
