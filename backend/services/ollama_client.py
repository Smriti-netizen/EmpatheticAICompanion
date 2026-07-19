from __future__ import annotations

import logging

import httpx

from config import settings
from services.prompts import load_system_prompt

logger = logging.getLogger(__name__)

# Do NOT retry here — callers already retry once; nested retries multiply latency.
OLLAMA_TIMEOUT_SEC = 60.0
# Keep weights resident like interactive `ollama run`.
OLLAMA_KEEP_ALIVE = "60m"
MAX_CONTEXT_MESSAGES = 20  # ~8–10 conversational turns


class OllamaError(Exception):
    """Ollama unreachable or unexpected payload."""


def trim_messages(messages: list[dict], max_n: int = MAX_CONTEXT_MESSAGES) -> list[dict]:
    """Keep newest messages; drop a leading orphan assistant turn."""
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
    # Empty → "" so callers retry via looks_malformed (no nested retries here).
    if not isinstance(content, str):
        return ""
    return content.strip()


def warm_model() -> bool:
    """Preload counselor weights so the first user turn is not cold."""
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
