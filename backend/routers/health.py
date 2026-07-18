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
    payload = {
        "api": "up",
        "whisper": whisper,
        "whisper_error": stt_whisper.last_error(),
        "piper": piper,
        "tts": tts_status,
        "tts_engine": tts_engine,
        "model": settings.ollama_model,
    }
    try:
        ollama = await ollama_health()
        payload.update(
            {
                "ollama": ollama.get("ollama", "up"),
                "model_loaded": ollama.get("model_loaded", False),
                "models": ollama.get("models", []),
            }
        )
    except OllamaError as exc:
        payload.update(
            {
                "ollama": "down",
                "model_loaded": False,
                "models": [],
                "error": str(exc),
            }
        )
    return payload
