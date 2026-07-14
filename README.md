# Empathic Companion

Web-first AI counselor: conversational onboarding → avatar → 45-min sessions in a call room.

**Voice (P4):** Silero VAD in the browser → Whisper STT → Ollama counselor → Piper or edge-tts audio.  
**Avatar (P5):** Hop / Aura / Spark with blink, breath, lip motion.  
**Deploy (P7):** Oracle A1 via `deploy/oracle-setup.sh`.

See `PROGRESS.md`.

## Local run

```powershell
# One-time voice stack
.\scripts\setup_voice.ps1

# Terminal 1 — API
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Web
cd frontend
npm run dev
```

- App: http://localhost:5173 (or the port Vite prints)  
- API docs: http://127.0.0.1:8000/docs  
- Health should show `whisper: ready` and `tts: ready` for the full voice path  

Use **Dashboard → Start a session now** for immediate counseling.
