# Empathic Companion

Web-first AI counseling companion: conversational onboarding → avatar pick → booked or instant sessions in a call-room UI with live voice.

You speak; the app listens (browser VAD), transcribes (Whisper), thinks (Ollama counselor), and replies with spoken audio (Piper or edge-tts) while a cat avatar reacts on screen.

## What you get

| Flow | What happens |
|------|----------------|
| Landing → Onboarding | Consent + PHQ-9 / GAD-7 style chat intake |
| Avatar | Pick Milo / Coco / Ziggy (ids: hop / aura / spark) |
| Book or Dashboard | Schedule a slot, or start a practice/session now |
| Call room | ~45-min voice session, optional camera PiP, End call |
| Crisis | Helpline resources when needed |

## Stack

- **Frontend:** React 19, Vite, Tailwind 4, React Router  
- **Backend:** FastAPI, SQLite, SQLAlchemy  
- **LLM:** Ollama model `empathic-counselor` (Llama 3.2 mental-health fine-tune)  
- **Voice:** Silero VAD (browser) → faster-whisper STT → Piper / edge-tts  
- **Avatar:** Live cat rig (blink, breath, lip sync); Live2D folder ready as drop-in  

## Local run

### Prerequisites

- Node.js 20+
- Python 3.11+
- [Ollama](https://ollama.com) running locally
- Microphone permission in the browser (for voice sessions)

### One-time setup

```powershell
# Voice stack (Whisper + TTS deps)
.\scripts\setup_voice.ps1

# LLM (once)
ollama create empathic-counselor -f deploy/Modelfile
```

Optional: see [`models/README.md`](models/README.md) for GGUF / Piper paths.

### Terminal 1 — API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 — Web

```powershell
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- API docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/api/v1/health  

For full voice, health should show `whisper: ready` and `tts: ready`.  
Use **Dashboard → Start a session now** for an immediate counseling call.

## Project layout

```text
backend/          FastAPI app, routers, voice/LLM services, SQLite
frontend/         React UI (landing, onboarding, avatar, book, session)
deploy/           Oracle A1 setup, nginx, systemd, Ollama Modelfile
scripts/          Voice setup, e2e API smoke test
design/           Static HTML design references
models/           Local model binaries (gitignored) — see models/README.md
```

## Docs

| Doc | Purpose |
|-----|---------|
| [`PROJECT.md`](PROJECT.md) | Full story: what this project is, how it works, what was built |
| [`PROGRESS.md`](PROGRESS.md) | Phase gates, product decisions, voice checklist |
| [`models/README.md`](models/README.md) | LLM / Whisper / Piper model notes |

## Quick test

```powershell
backend\.venv\Scripts\python.exe scripts\e2e_api_flow.py
cd frontend; npm run build
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

## Deploy (Oracle)

Scripts live under `deploy/` — see `deploy/oracle-setup.sh` and `PROGRESS.md` (P7).

## Important notes

- This is an **AI companion**, not a licensed therapist. Crisis flows point to real helplines (e.g. Tele-MANAS).
- Restart uvicorn after `setup_voice.ps1` so Whisper/TTS warm up correctly.
- Large model files stay out of git; download them locally or on the server.
