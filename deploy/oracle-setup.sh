#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/empathic-companion}"

echo "==> System packages"
sudo apt update
sudo apt install -y python3.11-venv python3-pip nginx certbot python3-certbot-nginx \
  ffmpeg curl git build-essential

echo "==> Ollama"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
# Create model after GGUF/Modelfile present:
#   ollama create empathic-counselor -f "$REPO_DIR/deploy/Modelfile"

echo "==> Backend venv + deps"
cd "$REPO_DIR/backend"
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt

echo "==> Voice (Whisper + edge-tts / Piper)"
bash "$REPO_DIR/scripts/setup_voice.sh"

# Optional: install piper binary for aarch64 if available
# wget piper release and place on PATH, then set PIPER_MODEL_PATH in .env

echo "==> .env skeleton"
if [[ ! -f .env ]]; then
  cat > .env <<EOF
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=empathic-counselor
WHISPER_MODEL=small
CORS_ORIGINS=https://YOUR_VERCEL_DOMAIN,http://localhost:5173
DB_PATH=$REPO_DIR/backend/data/empathic.db
EOF
fi

echo "==> systemd"
sudo cp "$REPO_DIR/deploy/empathic-api.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now empathic-api

echo "==> nginx"
sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/empathic
sudo ln -sf /etc/nginx/sites-available/empathic /etc/nginx/sites-enabled/empathic
sudo nginx -t && sudo systemctl reload nginx
# sudo certbot --nginx -d api.yourdomain.com

echo "P7 bootstrap complete. Health: curl -s http://127.0.0.1:8000/api/v1/health"
