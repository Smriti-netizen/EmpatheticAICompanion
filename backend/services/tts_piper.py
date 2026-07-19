from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)


def status() -> str:
    if settings.piper_model_path and Path(settings.piper_model_path).exists():
        if shutil.which("piper"):
            return "ready"
    return "skipped"


def synthesize(text: str) -> bytes:
    if status() != "ready":
        raise RuntimeError("Piper TTS is not configured.")

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "out.wav"
        cmd = [
            "piper",
            "--model",
            settings.piper_model_path,
            "--output_file",
            str(out),
        ]
        subprocess.run(
            cmd,
            input=text.encode("utf-8"),
            check=True,
            capture_output=True,
        )
        return out.read_bytes()
