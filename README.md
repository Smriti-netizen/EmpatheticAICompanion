# Empathic Companion

AI counseling companion in the browser.

User journey: onboarding chat → pick an avatar → book or start a session → talk in a call room (voice in, voice out).

## Run locally

Needs: Node.js, Python 3.11+, [Ollama](https://ollama.com), mic access in the browser.

**One-time**

```powershell
.\scripts\setup_voice.ps1
ollama create empathic-counselor -f deploy/Modelfile
```

Model download / Piper notes: [`models/README.md`](models/README.md).

**API** (terminal 1)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Web** (terminal 2)

```powershell
cd frontend
npm run dev
```

- App: http://localhost:5173  
- API docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/api/v1/health → expect `whisper: ready`, `tts: ready`

Dashboard → **Start a session now** for an immediate call.

After `setup_voice.ps1`, restart uvicorn so Whisper/TTS load.

## Folders

| Folder | What |
|--------|------|
| `frontend/` | React UI |
| `backend/` | FastAPI + SQLite |
| `scripts/` | Setup / test helpers |
| `deploy/` | Server setup files (if you host on a VM) |
| `models/` | Local model files — see its README |
| `design/` | HTML design drafts |

More detail on how the app works: [`PROJECT.md`](PROJECT.md).

## Stack

React + Vite · FastAPI · Ollama · Whisper STT · Piper or edge-tts · cat avatars (Milo / Coco / Ziggy)
