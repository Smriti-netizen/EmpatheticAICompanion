# Empathic Companion — progress

## Product decisions (locked)

| Choice | Decision |
|--------|----------|
| Intake | Chat questionnaire (PHQ-9 / GAD-7 in conversation) |
| Avatars | Original cats **Milo / Coco / Ziggy** (ids hop/aura/spark) |
| Session | Video-call room + End call |
| Voice | Silero VAD → Whisper → Piper/edge-tts (browser fallback only if Whisper offline) |
| Camera | Optional PiP + on-device cues |
| Type fallback | Hidden “Type instead” |

## Gates

| Phase | Status |
|-------|--------|
| P0–P3 core APIs | **PASS** |
| P4 Voice | **INTEGRATED** — restart uvicorn after `scripts/setup_voice.ps1` |
| P5 Avatar life | **PASS** — FluidCat Milo/Coco/Ziggy + amplitude mouth; Live2D drop-in folder ready |
| P6 Openings | **PASS** — `Hi {name}` |
| P7 Oracle | **SCRIPTS READY** |

## Voice (Phase 0 checklist)

1. `.\scripts\setup_voice.ps1`
2. **Restart** uvicorn (old process keeps `whisper: skipped`)
3. Open http://127.0.0.1:8000/api/v1/health → expect `whisper: ready`, `tts: ready`, `tts_engine: edge-tts|piper`
4. Session header must show `Whisper + …` not `browser fallback`

Startup now warms Whisper/TTS and health exposes `whisper_error` if load fails.

## Avatars

- Catalog: Milo / Coco / Ziggy with `modelPath` + `gestureMap`
- Runtime: `FluidCatAvatar` (blink, breath, ear wiggle, expression poses, voice mouth)
- Live2D: place Cubism exports under `frontend/public/avatars/{milo,coco,ziggy}/` (see README there)
- Picker uses static `preview.svg` (no three Pixi instances)

## Test

```powershell
backend\.venv\Scripts\python.exe scripts\e2e_api_flow.py
cd frontend; npm run build
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```
