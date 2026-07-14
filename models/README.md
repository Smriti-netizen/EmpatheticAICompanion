# Models (gitignored binaries)

Download locally / on Oracle — do not commit large files.

## LLM GGUF

- Source: https://huggingface.co/EddyGiusepe/Llama-3.2-3b-it-mental-health
- File: `unsloth.Q4_K_M.gguf` (~2.02 GB)
- Create: `ollama create empathic-counselor -f deploy/Modelfile`

Current local Modelfile may `FROM` the Hugging Face Ollama tag instead of a local GGUF path.

## Piper voice (P4)

- Preferred: `en_US-lessac-medium.onnx` (+ JSON) under `models/`
- Set `PIPER_MODEL_PATH` in `backend/.env`
- Install Piper CLI from https://github.com/rhasspy/piper/releases and put `piper` on PATH
- If Piper is missing, backend uses **edge-tts** (`en-US-JennyNeural`) automatically

## Whisper (P4)

- `pip install faster-whisper` (in requirements)
- `WHISPER_MODEL=small` (CPU int8)
- Run: `scripts/setup_voice.ps1` (Windows) or `scripts/setup_voice.sh` (Linux)

## Check

```text
GET /api/v1/health → whisper: ready, tts: ready, tts_engine: piper|edge-tts
```
