import re

CRISIS_PATTERNS = [
    r"kill myself",
    r"suicide",
    r"end my life",
    r"want to die",
    r"don'?t want to (live|be alive)",
    r"no (point|reason) (in|to) liv",
    r"want to go to .+ (in )?heaven",
    r"wish i (could|can) (die|go to heaven)",
    r"join .+ in heaven",
    r"self[- ]harm",
    # Hindi / Hinglish — include common spellings (mann/mnn, nahi/nhi)
    r"jeena nahi",
    r"jeena\s+ka\s+m+a?n+n?\s+(?:nahi|nhi)",
    r"jeene\s+ka\s+m+a?n+n?\s+(?:nahi|nhi)",
    r"jee\s+(?:nahi|nhi)\s+chaht",
    r"marna\s+chaht",
    r"marr?na\s+chaht",
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

# Warm fallbacks when the model produces garbled/unusable output or is down.
# These must sound like a real counselor turn — never "still thinking".
MODEL_GATHER_FALLBACK = (
    "I'm right here with you — what you shared matters. "
    "What feels heaviest about it right now?"
)
MODEL_CRISIS_FALLBACK = (
    "Thank you for trusting me with something this heavy. "
    "You don't have to hold it alone — I'm here. "
    "Are you safe right now?"
)


def gather_fallback(locale: str | None = None) -> str:
    _ = locale
    return MODEL_GATHER_FALLBACK


def crisis_fallback(locale: str | None = None) -> str:
    _ = locale
    return MODEL_CRISIS_FALLBACK

_REPEATED_CHAR = re.compile(r"(.)\1{6,}")  # same char 7+ times in a row
_SYMBOL_RUN = re.compile(r"[^\w\s]{5,}", re.UNICODE)  # long run of punctuation/symbols
# Latin OR Indic scripts (Hindi/Bengali/Tamil/etc.) — pure Hindi must not look "malformed".
_REAL_WORD = re.compile(
    r"[A-Za-z]{2,}|[\u0900-\u097F]{2,}|[\u0980-\u09FF]{2,}|"
    r"[\u0A80-\u0AFF]{2,}|[\u0B80-\u0BFF]{2,}|[\u0C00-\u0C7F]{2,}|"
    r"[\u0C80-\u0CFF]{2,}|[\u0D00-\u0D7F]{2,}"
)


# Model sometimes lectures about languages instead of counseling — reject those.
_LANGUAGE_META = re.compile(
    r"(?i)(?:"
    r"mix(?:ture)? of \w+ and \w+"
    r"|mixing (?:\w+/?)+ (?:and|&) \w+"
    r"|using a mix of"
    r"|don'?t seem (?:to )?sense"
    r"|doesn'?t (?:seem to )?make sense"
    r"|phrases you provided"
    r"|try my best to respond in"
    r"|i'?ll (?:try to )?respond in"
    r"|please (?:speak|continue|use).{0,48}language"
    r"|which language"
    r"|in (?:pure )?hindi/?telugu"
    r")"
)


def looks_language_meta(text: str) -> bool:
    """True when the model meta-talks about languages instead of counseling."""
    return bool(_LANGUAGE_META.search(text or ""))


# (user cue, reply must match, topic id) — small models invent a different story.
_TOPIC_GROUNDING: list[tuple[re.Pattern[str], re.Pattern[str], str]] = [
    (
        re.compile(
            r"(?i)relation|break\s*-?\s*up|boyfriend|girlfriend|ex\b|toot|"
            r"tut\s*g|pyaar|partner|shaadi|dating"
        ),
        re.compile(
            r"(?i)relation|break|boyfriend|girlfriend|partner|ex\b|toot|"
            r"pyaar|love|saath|together|years?"
        ),
        "relationship",
    ),
    (
        re.compile(r"(?i)\bneet\b|exam|fail|attempt|result|padhai|padha"),
        re.compile(r"(?i)neet|exam|fail|attempt|result|stud|padh"),
        "exams",
    ),
    (
        re.compile(
            r"(?i)nani|nana|dada|dadi|expire|passed away|die|death|funeral|swarg|heaven"
        ),
        re.compile(
            r"(?i)nani|nana|dada|dadi|loss|grief|pass|die|death|gone|miss|yaad|swarg|heaven"
        ),
        "grief",
    ),
]

_BAD_COUNSELOR_OPENERS = re.compile(
    r"(?i)^\s*this is good stuff"
    r"|great stuff"
    r"|i think i understand\.?\s*you'?re saying that your last year"
    r"|full[- ]time job"
    r"|seven to seven"
    r"|i got a little lost there"
)


_DEVANAGARI = re.compile(r"[\u0900-\u097F]")
_HINGLISH_CUES = re.compile(
    r"(?i)\b(hai|hain|hoon|hun|kya|bahut|dil|mujhe|tumhe|tum|mera|meri|"
    r"raha|rahi|nahi|nhi|kyun|kaise|abhi|sach|dard|dukh)\b"
)
_ENGLISH_CUES = re.compile(
    r"(?i)\b(the|you|your|that|this|what|how|feeling|sounds|really|"
    r"understand|about|right now|something)\b"
)


def looks_wrong_language(reply: str, locale: str | None) -> bool:
    """Reserved — sessions are English-only; never reject English replies."""
    _ = reply, locale
    return False


def looks_ungrounded(user_text: str, reply: str) -> bool:
    """True when the reply invents a different topic than what the client said."""
    if not user_text or not reply:
        return False
    if _BAD_COUNSELOR_OPENERS.search(reply):
        return True
    for user_pat, reply_pat, _topic in _TOPIC_GROUNDING:
        if user_pat.search(user_text) and not reply_pat.search(reply):
            return True
    return False


_TOPIC_FALLBACKS: dict[str, str] = {
    "relationship": (
        "Seven years with someone, and then a breakup — that can leave such a tender ache. "
        "What feels hardest about it right now?"
    ),
    "exams": (
        "Putting so much into an attempt and still not getting through — that really hurts. "
        "What feels heaviest about it right now?"
    ),
    "grief": (
        "Losing someone you're so close to can make everything feel softer and heavier at once. "
        "What are you missing most right now?"
    ),
}


def grounded_fallback(user_text: str, locale: str | None = None) -> str | None:
    """Topic-specific warm English line when the model invents a different story."""
    _ = locale
    for user_pat, _reply_pat, topic in _TOPIC_GROUNDING:
        if user_pat.search(user_text or ""):
            return _TOPIC_FALLBACKS.get(topic)
    return None


def looks_malformed(text: str) -> bool:
    """Basic sanity check on AI output before it's ever shown to the user.

    Flags empty, too-short, symbol-heavy, repetitive junk, or language-meta
    lectures so the caller can retry once and fall back warmly.
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
    if looks_language_meta(t):
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


_INDIC_CHAR = re.compile(
    r"[\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF"
    r"\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]"
)


def coerce_reply_language(text: str, locale: str | None) -> str:
    """Remove side-by-side English↔Indic duplicates so TTS speaks one language.

    Small models often emit English then a Hindi 'translation' of the same
    turn — that sounds like a double voice when read aloud.
    """
    t = (text or "").strip()
    if not t:
        return t
    loc = (locale or "en").lower().replace("_", "-")
    chunks = [c.strip() for c in re.split(r"(?<=[.!?।?\n])\s+", t) if c.strip()]
    if len(chunks) < 2:
        return t

    def has_indic(s: str) -> bool:
        return bool(_INDIC_CHAR.search(s))

    def mostly_latin(s: str) -> bool:
        letters = [c for c in s if c.isalpha()]
        if len(letters) < 4:
            return False
        latin = sum(1 for c in letters if ord(c) < 128)
        return (latin / len(letters)) >= 0.85

    indic = [c for c in chunks if has_indic(c)]
    latin = [c for c in chunks if mostly_latin(c) and not has_indic(c)]
    if not indic or not latin:
        return t

    kept = latin if loc.startswith("en") else indic
    out = " ".join(kept).strip()
    return out if len(out) >= 3 else t