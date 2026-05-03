"""Unit tests for build_system_prompt — we need to guarantee that:
  • Canonical facts appear and are flagged as authoritative
  • Crowd contributions are capped + clamped
  • Plurality / hierarchy-of-truth rule is in the rules layer
  • Both languages produce the right markers
"""
from poi_chat import build_system_prompt, MAX_CROWD_ENTRIES, MAX_CROWD_CHARS


BASE_POI = {
    "id": "test-poi",
    "name": "Test Place",
    "address": "Via Test 1",
    "short_description": "A short one.",
    "long_description": "A longer description.",
    "fun_fact": "It exists.",
    "opening_line": {"it": "Ciao.", "en": "Hello."},
}


def _crowd(n: int) -> list[dict]:
    return [
        {
            "type": "narrative",
            "user_name": f"user{i}",
            "title": "",
            "content": f"Memory number {i}. " + ("x" * 600),
        }
        for i in range(n)
    ]


def test_canonical_facts_appear_in_prompt_en():
    poi = {**BASE_POI, "canonical_facts": ["Founded 1776.", "Built by X."]}
    s = build_system_prompt(poi, [], None, "en")
    assert "CANONICAL FACTS" in s
    assert "Founded 1776." in s
    assert "Built by X." in s


def test_canonical_facts_appear_in_prompt_it():
    poi = {**BASE_POI, "canonical_facts": ["Fondato nel 1776."]}
    s = build_system_prompt(poi, [], None, "it")
    assert "FATTI CANONICI" in s
    assert "Fondato nel 1776." in s


def test_crowd_capped_to_max_entries():
    poi = {**BASE_POI, "canonical_facts": []}
    crowd = _crowd(20)  # more than MAX_CROWD_ENTRIES
    s = build_system_prompt(poi, crowd, None, "en")
    # Entry MAX_CROWD_ENTRIES-1 must be there, MAX_CROWD_ENTRIES must NOT.
    assert f"Memory number {MAX_CROWD_ENTRIES - 1}" in s
    assert f"Memory number {MAX_CROWD_ENTRIES}" not in s


def test_crowd_per_entry_clamped():
    poi = {**BASE_POI, "canonical_facts": []}
    long_content = "A" * 2000
    crowd = [{"type": "narrative", "user_name": "u", "title": "", "content": long_content}]
    s = build_system_prompt(poi, crowd, None, "en")
    # The very long string must have been truncated; confirm it doesn't appear in full.
    assert "A" * 1000 not in s
    # Ellipsis indicates the clamp ran.
    assert "…" in s
    # And the per-entry chunk should be ≤ MAX_CROWD_CHARS-ish (allow header overhead).
    crowd_section = s.split("MEMORIES LEFT BY VISITORS")[1]
    assert len(crowd_section.split("\n")[1]) <= MAX_CROWD_CHARS + 80


def test_plurality_rule_present_en():
    s = build_system_prompt(BASE_POI, [], None, "en")
    # Core hierarchy-of-truth signal phrases.
    assert "HIERARCHY OF TRUTH" in s
    assert "plural testimonies" in s
    assert "some say" in s.lower()


def test_plurality_rule_present_it():
    s = build_system_prompt(BASE_POI, [], None, "it")
    assert "GERARCHIA DELLA VERITÀ" in s
    assert "alcuni dicono" in s
    assert "testimonianze plurali" in s


def test_canonical_section_omitted_when_empty():
    s = build_system_prompt(BASE_POI, [], None, "en")
    # The labelled section header should not appear when there are no facts.
    assert "CANONICAL FACTS (curator-verified" not in s


def test_crowd_section_omitted_when_empty():
    s = build_system_prompt(BASE_POI, [], None, "en")
    assert "MEMORIES LEFT BY VISITORS (plural" not in s
