from pathlib import Path

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "counselor_system.txt"


def load_system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8").strip()
