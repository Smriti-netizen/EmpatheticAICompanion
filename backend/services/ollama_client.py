"""Ollama HTTP adapter — infrastructure only, no business rules."""

from __future__ import annotations

import logging

import httpx

from config import settings
from services.prompts import load_system_prompt

logger = logging.getLogger(__name__)


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an unexpected payload."""


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
    outbound.extend(messages)

    payload = {
        "model": settings.ollama_model,
        "messages": outbound,
        "stream": False,
        "options": {"temperature": temperature, "num_predict": 220},
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
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
    if not isinstance(content, str) or not content.strip():
        # One retry — occasional empty completions under load.
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{settings.ollama_host}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
            content = data.get("message", {}).get("content")
        except httpx.HTTPError as exc:
            raise OllamaError("Counselor model is temporarily unavailable.") from exc
        if not isinstance(content, str) or not content.strip():
            raise OllamaError("Counselor returned an empty reply.")
    return content.strip()


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
