"""Unit tests for the clone-wizard helpers.

We don't exercise the live Claude call here — the LLM response is
non-deterministic and can burn through the Emergent LLM budget quickly.
These tests cover the pure-Python slice: slug normalisation and the
JSON extraction that tolerates markdown fences around the model output.
"""
import json

import pytest

from area_clone import _extract_json, _slugify, _build_user_prompt


class TestSlugify:
    def test_basic(self):
        assert _slugify("Trastevere") == "trastevere"

    def test_unicode_strip(self):
        assert _slugify("Vico Equense") == "vico-equense"
        assert _slugify("Saint-Germain-des-Prés") == "saint-germain-des-pres"

    def test_mixed_whitespace_punctuation(self):
        assert _slugify("Belleville  /  20e") == "belleville-20e"

    def test_empty_fallback(self):
        assert _slugify("") == "area"
        assert _slugify("…") == "area"


class TestExtractJson:
    def test_plain(self):
        src = '{"slug":"x","brand":{"en":"Aura"}}'
        assert _extract_json(src) == {"slug": "x", "brand": {"en": "Aura"}}

    def test_with_markdown_fence(self):
        src = '```json\n{"slug":"x"}\n```'
        assert _extract_json(src) == {"slug": "x"}

    def test_with_plain_fence(self):
        src = '```\n{"slug":"x"}\n```'
        assert _extract_json(src) == {"slug": "x"}

    def test_invalid_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _extract_json("not json at all")


class TestUserPrompt:
    def test_city_only(self):
        p = _build_user_prompt("Trastevere", None, None)
        assert "Trastevere" in p
        assert "Country" not in p
        assert "vibe" not in p.lower()

    def test_city_and_country(self):
        p = _build_user_prompt("Trastevere", "Italy", None)
        assert "Country: Italy" in p

    def test_all_three(self):
        p = _build_user_prompt("Trastevere", "Italy", "bohemian night")
        assert "bohemian night" in p
        assert "vibe hint" in p.lower()
