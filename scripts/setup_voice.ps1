$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Models = Join-Path $Root "models"
$VenvPip = Join-Path $Backend ".venv\Scripts\pip.exe"
$VenvPy = Join-Path $Backend ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPip)) {
  Write-Host "Create venv first: cd backend; python -m venv .venv"
  exit 1
}

New-Item -ItemType Directory -Force -Path $Models | Out-Null

Write-Host "==> Installing faster-whisper + edge-tts"
& $VenvPip install "faster-whisper>=1.1.0" "edge-tts>=6.1.0"

Write-Host "==> Warming Whisper model download (small, CPU int8)"
& $VenvPy -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8'); print('whisper ok')"

# Optional Piper voice (needs piper.exe on PATH)
$PiperVoice = "en_US-lessac-medium"
$Onnx = Join-Path $Models "$PiperVoice.onnx"
$Json = Join-Path $Models "$PiperVoice.onnx.json"
$Base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"

if (-not (Test-Path $Onnx)) {
  Write-Host "==> Downloading Piper voice $PiperVoice (optional)"
  try {
    Invoke-WebRequest -Uri "$Base/$PiperVoice.onnx" -OutFile $Onnx
    Invoke-WebRequest -Uri "$Base/$PiperVoice.onnx.json" -OutFile $Json
  } catch {
    Write-Host "Piper model download skipped/failed — edge-tts will be used instead."
  }
}

$EnvFile = Join-Path $Backend ".env"
$PiperLine = "PIPER_MODEL_PATH=$Onnx"
if (Test-Path $Onnx) {
  if (Test-Path $EnvFile) {
    $content = Get-Content $EnvFile -Raw
    if ($content -notmatch "PIPER_MODEL_PATH=") {
      Add-Content $EnvFile "`n$PiperLine"
    }
  } else {
    Set-Content $EnvFile "WHISPER_MODEL=small`n$PiperLine`n"
  }
  Write-Host "Set PIPER_MODEL_PATH (also install piper CLI from https://github.com/rhasspy/piper/releases)"
} else {
  if (-not (Test-Path $EnvFile)) {
    Set-Content $EnvFile "WHISPER_MODEL=small`n"
  }
}

Write-Host ""
Write-Host "Done. Restart uvicorn, then check GET /api/v1/health — whisper/tts should be ready."
Write-Host "Call room uses Silero VAD + Whisper when whisper=ready; TTS prefers Piper then edge-tts."
