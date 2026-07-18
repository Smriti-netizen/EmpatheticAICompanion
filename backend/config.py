from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        extra="ignore",
    )

    ollama_host: str = "http://127.0.0.1:11434"
    ollama_model: str = "empathic-counselor"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:5175,http://127.0.0.1:5175,"
        "http://localhost:5176,http://127.0.0.1:5176"
    )

    db_path: str = str(_BACKEND_ROOT / "data" / "empathic.db")
    # base.en is ~3x faster than small on CPU and accurate for English.
    # Use "small" (multilingual) if you need Hindi/Hinglish transcription.
    whisper_model: str = "base.en"
    whisper_language: str = "en"
    whisper_beam_size: int = 1
    piper_model_path: str = ""
    consent_version: str = "2026-07-01"
    session_join_early_min: int = 5
    session_join_late_min: int = 15
    session_duration_sec: int = 2700
    # "Start now" sessions run 30 minutes; scheduled sessions use the full slot.
    session_practice_duration_sec: int = 1800
    session_buffer_min: int = 10


settings = Settings()
