import json
import sys
import urllib.request

OLLAMA = "http://127.0.0.1:11434/api/chat"
MODEL = "empathic-counselor"

prompt = " ".join(sys.argv[1:]) or "I've been feeling anxious before sleep for two weeks."

payload = {
    "model": MODEL,
    "messages": [{"role": "user", "content": prompt}],
    "stream": False,
}

req = urllib.request.Request(
    OLLAMA,
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
    print(data["message"]["content"])
except Exception as e:
    print(f"Failed: {e}")
    print("Run: ollama create empathic-counselor -f deploy/Modelfile")
    sys.exit(1)