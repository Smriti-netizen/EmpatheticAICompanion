import json
import urllib.request

API = "http://127.0.0.1:8000/api/v1/chat"
messages = []

print("Empathic Companion — type 'quit' to exit\n")

while True:
    try:
        user = input("You: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nBye.")
        break
    if not user:
        continue
    if user.lower() in {"quit", "exit", "q"}:
        break

    messages.append({"role": "user", "content": user})
    try:
        req = urllib.request.Request(
            API,
            data=json.dumps({"messages": messages}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.loads(resp.read())
    except Exception as e:
        print(f"Error: {e}\nIs API running? uvicorn main:app --port 8000")
        messages.pop()
        continue

    reply = out["reply"]
    if out.get("crisis"):
        print(f"\n[Crisis mode]\nCounselor: {reply}\n")
        break

    messages.append({"role": "assistant", "content": reply})
    print(f"Counselor: {reply}\n")