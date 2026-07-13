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

OUTPUT_BLOCK = [
    re.compile(r"\b(you have|you are diagnosed with)\s+(depression|anxiety|bipolar|ptsd|adhd)", re.I),
    re.compile(r"\b\d+\s*mg\b", re.I),
    re.compile(r"\bprescribe\b", re.I),
]


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