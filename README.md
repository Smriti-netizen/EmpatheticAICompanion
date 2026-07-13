# Empathic Companion

Web-first AI counselor: intake → screenings → 45-min booked sessions → text chat with avatar stage → chart memory. Voice (Whisper/Piper) and Rive `.riv` are next; Oracle A1 is production host.

See `PROGRESS.md` and the locked Full Product Implementation Spec.

## Local run

```powershell
# Terminal 1 — API
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2 — Web
cd frontend
npm run dev
```

- App: http://localhost:5173  
- API docs: http://127.0.0.1:8000/docs  

Use **Dashboard → Start practice session now** for immediate counseling without waiting for a calendar join window.
