"""Tests for the city-narrator intro payload exposed on /api/area.

The active area.config.json ships with a `narrator.intro.{it,en}` monologue
(~300 words each) that the frontend renders as a first-visit overlay. We
verify the loader round-trips the field, that the public /api/area surface
includes it, and that merged_area respects overrides.
"""
import os

import pytest
import requests

from area_config import public_area, merged_area, reload_area

API = os.environ.get("REACT_APP_BACKEND_URL") or ""
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                API = line.strip().split("=", 1)[1].strip('"').rstrip("/") + "/api"
                break
except FileNotFoundError:
    pass


@pytest.fixture(autouse=True)
def _pin_default(monkeypatch):
    monkeypatch.setenv("AREA_CONFIG_PATH", "/app/area.config.json")
    reload_area()
    yield
    monkeypatch.delenv("AREA_CONFIG_PATH", raising=False)
    reload_area()


def test_public_area_includes_narrator():
    p = public_area()
    assert "narrator" in p, "public_area must surface narrator"
    intro = (p.get("narrator") or {}).get("intro") or {}
    assert intro.get("it"), "Italian narrator intro is empty"
    assert intro.get("en"), "English narrator intro is empty"
    # Monologue is ~300 words; sanity-check a lower bound so we catch truncation.
    assert len(intro["it"].split()) >= 150
    assert len(intro["en"].split()) >= 150


def test_merged_area_preserves_narrator_without_override():
    out = merged_area(None)
    assert out.get("narrator", {}).get("intro", {}).get("it"), "narrator lost when no overrides"


def test_merged_area_shallow_merges_narrator_override():
    out = merged_area({"narrator": {"intro": {"it": "Sono una prova."}}})
    intro = out["narrator"]["intro"]
    # Italian overridden, English preserved from base config.
    assert intro["it"] == "Sono una prova."
    assert "Vico Equense" in intro["en"] or len(intro["en"]) > 100


def test_live_api_area_exposes_narrator():
    if not API:
        pytest.skip("REACT_APP_BACKEND_URL not set — skipping live check")
    r = requests.get(f"{API}/area", timeout=15)
    assert r.status_code == 200
    d = r.json()
    intro = (d.get("narrator") or {}).get("intro") or {}
    assert intro.get("it"), f"/api/area missing narrator.intro.it (got keys: {list(d.keys())})"
    assert intro.get("en")
