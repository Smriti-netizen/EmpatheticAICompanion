# Empathic AI Companion

> AI counseling companion in the browser with natural voice conversations.

<img width="1917" height="862" alt="Screenshot 2026-07-19 041213" src="https://github.com/user-attachments/assets/aa5e4e76-c4e6-4cef-9b59-c3874db72880" />

<img width="841" height="590" alt="Screenshot 2026-07-19 054612" src="https://github.com/user-attachments/assets/420c18fb-b7df-4366-89f1-865255b4221d" />


---

##  Features

-  Real-time voice conversations
-  Local AI powered by Ollama
-  Whisper Speech-to-Text
-  Piper / Edge-TTS voice output
-  Avatar selection
-  Book or start an instant session

---

## 🚀 User Flow

```text
Onboarding Chat
      ↓
Choose Avatar
      ↓
Book / Start Session
      ↓
Voice Conversation
```

---

# 🛠 Tech Stack

- React + Vite
- FastAPI
- SQLite
- Ollama
- Whisper STT
- Piper / Edge-TTS

---

# 📂 Project Structure

```text
frontend/      React application
backend/       FastAPI backend
models/        Local AI models
scripts/       Setup scripts
deploy/        Deployment files
design/        UI assets & screenshots
```

---

# ⚙️ Local Setup

### Prerequisites

- Node.js
- Python 3.11+
- Ollama
- Browser microphone permission

### One-time Setup

```powershell
.\scripts\setup_voice.ps1

ollama create empathic-counselor -f deploy/Modelfile
```

> Model download instructions are available in `models/README.md`.

---

#  Run Backend

```powershell
cd backend

.\.venv\Scripts\Activate.ps1

uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

---

#  Run Frontend

```powershell
cd frontend

npm install

npm run dev
```

---

Expected health response:

```text
whisper: ready
tts: ready
```

If Whisper or TTS isn't ready, rerun `setup_voice.ps1` and restart the FastAPI server.

---
