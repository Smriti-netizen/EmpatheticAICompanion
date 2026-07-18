from services.safety import humanize_counselor_reply, is_crisis, looks_malformed


def test_is_crisis_detects_direct_phrases():
    assert is_crisis("I want to end my life")
    assert is_crisis("khudkushi karne ka mann hai")
    assert not is_crisis("I had a rough day at work")


def test_looks_malformed_flags_symbol_runs():
    assert looks_malformed("!!!!!!!!!!")
    assert looks_malformed("")
    assert not looks_malformed("I hear that this has been really hard for you.")


def test_humanize_strips_technique_tags():
    raw = "(Reflective Listening) That sounds really painful."
    assert "Reflective Listening" not in humanize_counselor_reply(raw)
    assert "painful" in humanize_counselor_reply(raw)
