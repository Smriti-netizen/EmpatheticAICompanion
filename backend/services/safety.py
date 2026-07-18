import re

CRISIS_PATTERNS = [
    r"kill myself",
    r"suicide",
    r"end my life",
    r"want to die",
    r"self[- ]harm",
    r"jeena nahi",
    r"mar jaaun",
    r"mar jaunga",
    r"mar jaungi",
    r"khud ko nuksan",
    r"khudkushi",
]

CRISIS_RESPONSE = (
    "I'm really glad you told me that. Your safety matters most right now. "
    "Please call Tele-MANAS at 14416, iCall at 9152987821, or dial 112 if you are in immediate danger. "
    "You don't have to face this alone."
)

# Injected into the LLM instead of hard-stopping the session. The counselor
# stays present and works *with* the person the way a real therapist would.
CRISIS_CARE_HINT = (
    "[SAFETY — the client just expressed distress, hopelessness, or thoughts of "
    "self-harm/suicide]\n"
    "Do NOT end the conversation, do not become a hotline script, and do not lecture. "
    "Stay warm, calm, and fully present — this is exactly when they need you.\n"
    "- First, slow down and acknowledge how much pain they're in without judgment.\n"
    "- Gently, conversationally check safety: are they thinking of acting on this, do "
    "they have a plan, are they safe right now? Ask ONE caring question at a time.\n"
    "- Reflect their feelings, help them feel less alone, and look for reasons for "
    "living and small next-step coping (grounding, reaching a trusted person, getting "
    "through the next hour).\n"
    "- Only if they describe being in immediate danger or having a concrete plan, gently "
    "weave in that they can reach Tele-MANAS (14416) or emergency (112) — as an option "
    "offered with care, not a dismissal. Otherwise keep supporting them yourself.\n"
    "- Never say you can't help or that they must go elsewhere. Keep the door open."
)

OUTPUT_BLOCK = [
    re.compile(r"\b(you have|you are diagnosed with)\s+(depression|anxiety|bipolar|ptsd|adhd)", re.I),
    re.compile(r"\b\d+\s*mg\b", re.I),
    re.compile(r"\bprescribe\b", re.I),
]

# Warm fallback shown when the model produces garbled/unusable output. Pairs
# with the frontend ASCII-bloom so the user never sees raw broken text.
MODEL_GATHER_FALLBACK = "I want to say this right — give me a moment."

_REPEATED_CHAR = re.compile(r"(.)\1{6,}")  # same char 7+ times in a row
_SYMBOL_RUN = re.compile(r"[^\w\s]{5,}")  # long run of punctuation/symbols
_REAL_WORD = re.compile(r"[A-Za-z]{2,}")


def looks_malformed(text: str) -> bool:
    """Basic sanity check on AI output before it's ever shown to the user.

    Flags empty, too-short, symbol-heavy, or repetitive junk so the caller can
    retry once and fall back to a warm holding message.
    """
    if not text:
        return True
    t = text.strip()
    if len(t) < 3:
        return True
    if len(_REAL_WORD.findall(t)) < 1:
        return True
    letters = sum(c.isalpha() for c in t)
    if letters / len(t) < 0.4:  # mostly numbers/symbols
        return True
    if _REPEATED_CHAR.search(t) or _SYMBOL_RUN.search(t):
        return True
    return False


def is_crisis(text: str) -> bool:
    t = text.lower()
    return any(re.search(p, t) for p in CRISIS_PATTERNS)


# Model often leaks training-style tags, e.g. "(Reflective Listening)".
_TECHNIQUE_TAG = re.compile(
    r"\s*[\(\[]\s*(?:reflective\s+listening|active\s+listening|cbt|mi|"
    r"motivational\s+interviewing|validation|psychoeducation|"
    r"cognitive\s+restructuring|technique[:\s][^\)\]]+)[\)\]]",
    re.I,
)
_META_NARRATION = re.compile(
    r"(?i)(?:"
    r"thank you for being patient\.?\s*"
    r"|i was waiting for you to tell me what is on your mind,?\s*(?:but\s*)?"
    r"|the first question i should ask is[:\s]*"
    r"|as your (?:counselor|therapist)[,:]?\s*i (?:will|would) now\s*"
    r"|using (?:a |the )?(?:technique|approach) (?:of |called )?"
    r")",
)


def humanize_counselor_reply(text: str) -> str:
    """Strip technique labels and stiff meta-narration from model output."""
    cleaned = _TECHNIQUE_TAG.sub("", text)
    cleaned = _META_NARRATION.sub("", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = cleaned.strip(" ,;")
    # Capitalize first letter if we stripped a leading clause.
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned.strip()


def filter_output(text: str) -> str:
    for pat in OUTPUT_BLOCK:
        if pat.search(text):
            return (
                "I hear that this feels really heavy. I'm not able to give a medical diagnosis or "
                "medication advice. Can we focus on what's been hardest for you today?"
            )
    return humanize_counselor_reply(text)