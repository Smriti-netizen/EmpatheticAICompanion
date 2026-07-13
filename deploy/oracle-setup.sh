# Oracle A1 bootstrap (P7)

```bash
# Run on Ubuntu 22.04 aarch64 VM after cloning the repo
set -euo pipefail

curl -fsSL https://ollama.com/install.sh | sh
# Place GGUF then: ollama create empathic-counselor -f deploy/Modelfile

sudo apt update
sudo apt install -y python3.11-venv nginx certbot python3-certbot-nginx

cd /opt/empathic-companion/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure .env (CORS to Vercel, DB_PATH, OLLAMA_*)
# systemctl enable --now empathic-api
# nginx + certbot per deploy/nginx.conf
```

See `deploy/empathic-api.service` and `deploy/nginx.conf`.
