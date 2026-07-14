# Empathic Companion — progress

## Product decisions (locked)

| Choice | Decision |
|--------|----------|
| Intake | Chat questionnaire (PHQ-9 / GAD-7 in conversation) |
| Avatars | Original presets **Hop / Aura / Spark** (no third-party IP) |
| Session | Video-call room + End call |
| Voice | **Silero VAD → Whisper STT → Piper/edge-tts** (browser fallback if Whisper offline) |
| Camera | Optional PiP + on-device motion cues (no upload) |
| Type fallback | Hidden “Type instead” only |

## Gates

| Phase | Status |
|-------|--------|
| P0–P3 core APIs | **PASS** (`scripts/e2e_api_flow.py`) |
| Chat intake / onboarding | **PASS** |
| Avatar picker | **PASS** |
| **P4 Voice** | **INTEGRATED** — CallRoom → VAD + `/sessions/{id}/voice`; TTS via Piper or edge-tts; run `scripts/setup_voice.ps1` |
| **P5 Avatar life** | **PASS** — blink, breath, speaking mouth; Rive optional later |
| **P6 Memory / openings** | **PASS** — personalized `Hi {name}` openings + chart memory |
| **P7 Oracle deploy** | **SCRIPTS READY** — `deploy/oracle-setup.sh` + systemd/nginx |

## Voice architecture

1. Client: `@ricky0123/vad-web` (Silero) detects end of speech  
2. Client encodes 16 kHz WAV → `POST /api/v1/sessions/{id}/voice`  
3. Server: faster-whisper → counselor LLM → Piper **or** edge-tts → `audio_base64`  
4. Client: `playBase64Audio` (browser TTS only if no audio)  

Fallback when `health.whisper != ready`: previous browser SpeechRecognition loop.

## Setup voice locally

```powershell
cd C:\Users\smrit\OneDrive\empathaticaicompanion
.\scripts\setup_voice.ps1
# restart uvicorn, then:
# Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

## Test commands

```powershell
backend\.venv\Scripts\python.exe scripts\e2e_api_flow.py
cd frontend; npx tsx scripts/check_intake.ts
cd frontend; npm run build
```
