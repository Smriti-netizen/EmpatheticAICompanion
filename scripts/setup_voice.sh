#!/usr/bin/env bash
# P4 — install Whisper + optional Piper (Linux / Oracle)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
MODELS="$ROOT/models"
PIP="$BACKEND/.venv/bin/pip"
PY="$BACKEND/.venv/bin/python"

mkdir -p "$MODELS"
"$PIP" install "faster-whisper>=1.1.0" "edge-tts>=6.1.0"
"$PY" -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8'); print('whisper ok')"

VOICE="en_US-lessac-medium"
ONNX="$MODELS/${VOICE}.onnx"
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"
if [[ ! -f "$ONNX" ]]; then
  curl -L "$BASE/${VOICE}.onnx" -o "$ONNX" || true
  curl -L "$BASE/${VOICE}.onnx.json" -o "$MODELS/${VOICE}.onnx.json" || true
fi

ENV="$BACKEND/.env"
touch "$ENV"
grep -q '^WHISPER_MODEL=' "$ENV" || echo 'WHISPER_MODEL=small' >> "$ENV"
if [[ -f "$ONNX" ]]; then
  grep -q '^PIPER_MODEL_PATH=' "$ENV" || echo "PIPER_MODEL_PATH=$ONNX" >> "$ENV"
fi

echo "Done. Install piper binary for Piper TTS, else edge-tts is used."
echo "Restart API and check /api/v1/health"
