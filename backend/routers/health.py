from fastapi import APIRouter

from config import settings
from services import stt_whisper, tts, tts_piper
from services.ollama_client import OllamaError
from services.ollama_client import health as ollama_health

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    whisper = stt_whisper.ensure_ready()
    piper = tts_piper.status()
    tts_status = tts.status()
    tts_engine = tts.engine()
    try:
        ollama = await ollama_health()
        return {
            "api": "up",
            "ollama": ollama.get("ollama", "up"),
            "model_loaded": ollama.get("model_loaded", False),
            "whisper": whisper,
            "piper": piper,
            "tts": tts_status,
            "tts_engine": tts_engine,
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
            "tts": tts_status,
            "tts_engine": tts_engine,
            "models": [],
            "model": settings.ollama_model,
            "error": str(exc),
        }
