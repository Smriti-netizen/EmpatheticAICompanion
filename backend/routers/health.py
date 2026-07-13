from fastapi import APIRouter

from config import settings
from services.ollama_client import OllamaError
from services.ollama_client import health as ollama_health
from services import stt_whisper, tts_piper

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    whisper = stt_whisper.status()
    piper = tts_piper.status()
    try:
        ollama = await ollama_health()
        return {
            "api": "up",
            "ollama": ollama.get("ollama", "up"),
            "model_loaded": ollama.get("model_loaded", False),
            "whisper": whisper,
            "piper": piper,
            "models": ollama.get("models", []),
            "model": settings.ollama_model,
        }
    except OllamaError as exc:
        return {
            "api": "up",
            "ollama": "down",
            "model_loaded": False,
            "whisper": whisper,
            "piper": piper,
            "models": [],
            "model": settings.ollama_model,
            "error": str(exc),
        }
