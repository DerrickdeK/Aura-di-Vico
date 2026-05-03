"""Tests for the area template config loader (Option A: minimum-viable template)."""
import json
import os
import tempfile
from pathlib import Path

import pytest

from area_config import reload_area, load_area, pois_seed, landmarks_dict, public_area


@pytest.fixture(autouse=True)
def _pin_default_config(monkeypatch):
    """These tests exercise the bundled Brera JSON regardless of which city
    the live server is currently pointing at (via AREA_CONFIG_PATH)."""
    monkeypatch.setenv("AREA_CONFIG_PATH", "/app/area.config.json")
    reload_area()
    yield
    monkeypatch.delenv("AREA_CONFIG_PATH", raising=False)
    reload_area()


def test_default_config_loads():
    cfg = reload_area()
    assert cfg["slug"] == "brera-milano"
    assert "brand" in cfg and cfg["brand"]["it"]
    assert len(cfg["pois"]) >= 18
    assert len(cfg["landmarks"]) == 5


def test_public_area_payload_shape():
    payload = public_area()
    assert set(payload.keys()) >= {"slug", "brand", "area", "city", "map", "palette", "landmarks"}
    # Should NOT leak the full POI seed on the public endpoint
    assert "pois" not in payload
    # Palette is a flat map of CSS vars
    assert all(isinstance(v, str) for v in payload["palette"].values())


def test_pois_seed_is_list_of_dicts():
    pois = pois_seed()
    for p in pois:
        assert "name" in p and "latitude" in p and "longitude" in p
        assert isinstance(p.get("interest_tags", []), list)


def test_landmarks_dict_by_id():
    lms = landmarks_dict()
    assert set(lms.keys()) >= {"accademia", "pinacoteca", "scala"}
    accademia = lms["accademia"]
    assert accademia["name"]
    assert isinstance(accademia["canonical_facts"], list)
    # opening_line is the voice map used by Claude
    assert "it" in accademia["opening_line"] or "en" in accademia["opening_line"]


def test_override_path_via_env(monkeypatch, tmp_path):
    """AREA_CONFIG_PATH env var redirects to a different JSON so one codebase
    can serve multiple cities."""
    alt = tmp_path / "trastevere.json"
    alt.write_text(json.dumps({
        "slug": "trastevere-roma",
        "brand": {"it": "Aura di Trastevere", "en": "Aura di Trastevere"},
        "area": {"it": "Trastevere", "en": "Trastevere"},
        "city": {"it": "Roma", "en": "Rome"},
        "map": {"center": {"lat": 41.8892, "lng": 12.4682}},
        "palette": {"terracotta": "#A04030"},
        "landmarks": [],
        "pois": [],
    }))
    monkeypatch.setenv("AREA_CONFIG_PATH", str(alt))
    cfg = reload_area()
    assert cfg["slug"] == "trastevere-roma"
    assert public_area()["brand"]["en"] == "Aura di Trastevere"
    # Restore default
    monkeypatch.delenv("AREA_CONFIG_PATH")
    reload_area()
