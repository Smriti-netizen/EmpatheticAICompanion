# Empathic Companion — progress

## Product decisions (locked)

| Choice | Decision |
|--------|----------|
| Intake | Chat questionnaire (PHQ-9 / GAD-7 in conversation) |
| Avatars | Original presets **Hop / Aura / Spark** (no third-party IP) |
| Session | Video-call room, free speech via silence turns, End call |
| Camera | Optional PiP + on-device motion cues (no upload) |
| Type fallback | Hidden “Type instead” only |

## Gates

| Phase | Status |
|-------|--------|
| P0–P3 core APIs | **PASS** (`scripts/e2e_api_flow.py`) |
| Chat intake script | **PASS** (`frontend/scripts/check_intake.ts`) |
| Avatar picker | **PASS** (build) |
| Free-speech call room | **BUILT** — verify mic in Chrome on localhost |
| Browser speech | Depends on Chrome/Edge + mic permission |

## Conversational onboarding (CV-style)

UI-only redesign of `/intake`:
- Always-on chat composer (GPT-style)
- Typing indicator + varied acknowledgements
- Option chips collapse to selected user bubble
- Resume after refresh via `localStorage`
- Same `saveIntake` / `saveScreening` payloads


## Test commands

```powershell
backend\.venv\Scripts\python.exe scripts\e2e_api_flow.py
cd frontend; npx tsx scripts/check_intake.ts
cd frontend; npm run build
```
