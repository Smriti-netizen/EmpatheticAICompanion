from services.safety import (
    coerce_reply_language,
    grounded_fallback,
    humanize_counselor_reply,
    is_crisis,
    looks_language_meta,
    looks_malformed,
    looks_ungrounded,
    looks_wrong_language,
)


def test_is_crisis_detects_direct_phrases():
    assert is_crisis("I want to end my life")
    assert is_crisis("khudkushi karne ka mann hai")
    assert is_crisis(
        "mera neet ka attempt kharab gya, mujhe jeena ka mnn nhi krta"
    )
    assert is_crisis("mujhe jeene ka mann nahi karta")
    assert is_crisis("i want to go to my nana in heaven")
    assert not is_crisis("I had a rough day at work")


def test_looks_malformed_flags_symbol_runs():
    assert looks_malformed("!!!!!!!!!!")
    assert looks_malformed("")
    assert not looks_malformed("I hear that this has been really hard for you.")


def test_looks_malformed_flags_language_meta():
    junk = (
        "It seems like you are using a mix of Hindi and Telugu languages. "
        "The phrases you provided don't seem sense, but I'll try my best to "
        "respond in Hindi."
    )
    assert looks_language_meta(junk)
    assert looks_malformed(junk)
    assert not looks_malformed(
        "Breakup ke baad dil bahut dukhi hota hai. Ab sabse zyada kya chubh raha hai?"
    )


def test_coerce_reply_language_drops_side_by_side_translation():
    dual = (
        "I'm sorry about your breakup. That sounds really painful. "
        "मुझे तुम्हारे ब्रेकअप के बारे में दुख है। यह सच में बहुत पीड़ादायक लगता है।"
    )
    hindi_only = coerce_reply_language(dual, "hi-IN")
    assert "मुझे" in hindi_only
    assert "I'm sorry" not in hindi_only
    english_only = coerce_reply_language(dual, "en-IN")
    assert "I'm sorry" in english_only
    assert "मुझे" not in english_only


def test_looks_ungrounded_flags_invented_topic():
    user = "mere 7 years ka relationship toot gya hai"
    junk = (
        "This is good stuff...I think I understand. You're saying that your "
        "last year was not very good, and you are wondering if things will get better?"
    )
    assert looks_ungrounded(user, junk)
    ok = (
        "Seven years together ending is a huge loss. "
        "What feels hardest about the relationship ending right now?"
    )
    assert not looks_ungrounded(user, ok)
    fb = (grounded_fallback(user, "en-IN") or "").lower()
    assert "breakup" in fb or "years" in fb


def test_looks_wrong_language_disabled_for_english_only():
    # Multilingual replies paused — English is always acceptable.
    assert not looks_wrong_language(
        "That breakup after seven years sounds so heavy.",
        "en-IN",
    )


def test_humanize_strips_technique_tags():
    raw = "(Reflective Listening) That sounds really painful."
    assert "Reflective Listening" not in humanize_counselor_reply(raw)
    assert "painful" in humanize_counselor_reply(raw)
