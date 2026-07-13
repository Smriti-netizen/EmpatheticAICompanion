# Models (gitignored binaries)

Download locally / on Oracle — do not commit large files.

## LLM GGUF

- Source: https://huggingface.co/EddyGiusepe/Llama-3.2-3b-it-mental-health
- File: `unsloth.Q4_K_M.gguf` (~2.02 GB)
- Create: `ollama create empathic-counselor -f deploy/Modelfile`

Current local Modelfile may `FROM` the Hugging Face Ollama tag instead of a local GGUF path.

## Piper voice (P4)

- `en_US-lessac-medium.onnx` (+ JSON)
- Set `PIPER_MODEL_PATH` in backend `.env`

## Whisper (P4)

- Installed via `faster-whisper` when ready (`WHISPER_MODEL=small`)
