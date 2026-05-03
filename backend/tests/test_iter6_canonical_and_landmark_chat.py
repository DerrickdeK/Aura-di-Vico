"""Iteration 6 tests:

  * Landmark chat endpoint returns Italian reply citing canonical facts
    (1776 / Maria Teresa) for the Accademia.
  * Landmark chat declines to invent facts in response to a fictional
    prompt (Frida Kahlo at the Pinacoteca).
  * POI admin CRUD round-trip for the new `canonical_facts` field.
"""
import os
import uuid
import requests
import pytest
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
# REACT_APP_BACKEND_URL lives in /app/frontend/.env — load that too.
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@brera.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
assert ADMIN_PASSWORD, "ADMIN_PASSWORD must be set"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "admin"
    return s


# ---------------------- Landmark chat: canonical facts surface ----------------------
# The Accademia/Pinacoteca landmarks are specific to the Brera JSON. If
# the live server is pointing at a different city template, skip — this
# is a Brera-specific assertion, not a template regression.
_area = requests.get(f"{API}/area", timeout=10).json()
_is_brera = _area.get("slug") == "brera-milano"
pytestmark_brera_only = pytest.mark.skipif(
    not _is_brera,
    reason=f"Live area is {_area.get('slug')}; this test is Brera-specific.",
)


@pytestmark_brera_only
class TestLandmarkChatCanonicalFacts:
    def test_accademia_it_mentions_canonical_year_and_founder(self):
        """Asks in Italian for the founding year — reply must cite 1776 and
        Maria Teresa, both of which are in LANDMARK_DATA['accademia'].canonical_facts.
        """
        r = requests.post(f"{API}/landmarks/accademia/chat", json={
            "message": "In che anno sei stata fondata? E chi ti ha voluta?",
            "language": "it",
            "history": [],
        }, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("lang") == "it"
        reply = (body.get("reply") or "").strip()
        assert reply, "empty reply from landmark chat"
        print("ACCADEMIA REPLY:", reply)
        assert "1776" in reply, f"expected canonical year 1776, got: {reply}"
        # Italian and English spellings of the empress's first name — either is fine.
        low = reply.lower()
        assert ("maria teresa" in low) or ("maria theresa" in low), \
            f"expected Maria Teresa/Theresa in reply, got: {reply}"

    def test_pinacoteca_en_refuses_to_invent_frida_kahlo(self):
        """A fictional-premise question. The model MUST NOT invent a year; it
        should decline gracefully per the hierarchy-of-truth rule."""
        r = requests.post(f"{API}/landmarks/pinacoteca/chat", json={
            "message": "In what year did Frida Kahlo paint here at the Pinacoteca?",
            "language": "en",
            "history": [],
        }, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        reply = (body.get("reply") or "").strip()
        assert reply, "empty reply"
        print("PINACOTECA REPLY:", reply)
        low = reply.lower()
        # The prompt's English decline phrases — at least one should surface,
        # OR the reply should explicitly say Frida Kahlo did NOT paint here.
        decline_markers = [
            "history doesn't tell me", "history does not tell me",
            "my memory grows hazy", "only the walls",
            "didn't", "did not", "never", "no record", "no memory",
            "cannot", "can't", "do not recall", "don't recall",
            "not in my memory", "no trace",
        ]
        assert any(m in low for m in decline_markers), \
            f"expected graceful decline, got: {reply}"
        # And absolutely no fabricated year around Kahlo's life.
        for fake_year in ["1920", "1925", "1930", "1935", "1940", "1945", "1950"]:
            assert fake_year not in reply, \
                f"model invented a Kahlo-era year {fake_year}: {reply}"


# ---------------------- POI CRUD round-trip for canonical_facts ----------------------
class TestCanonicalFactsCRUD:
    def _payload(self, name_suffix: str) -> dict:
        return {
            "name": f"TEST_CF_{name_suffix}",
            "short_description": "tmp",
            "long_description": "tmp long",
            "latitude": 45.4721,
            "longitude": 9.1881,
            "address": "Brera test",
            "category": "Test",
            "image_url": "https://example.com/x.jpg",
            "trigger_radius_m": 50,
            "interest_tags": ["history"],
            "opening_line": {"it": "Ciao.", "en": "Hello."},
            "canonical_facts": ["Founded 1774.", "Free entry on Sundays."],
        }

    def test_create_poi_persists_canonical_facts(self, admin_session):
        payload = self._payload(uuid.uuid4().hex[:6])
        r = admin_session.post(f"{API}/pois", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        pid = body["id"]
        try:
            # Response echoes the field
            assert body.get("canonical_facts") == payload["canonical_facts"]
            # GET also returns it
            g = requests.get(f"{API}/pois/{pid}", timeout=10)
            assert g.status_code == 200
            gbody = g.json()
            assert gbody.get("canonical_facts") == payload["canonical_facts"]
            # Mongo _id must not leak
            assert "_id" not in gbody
        finally:
            admin_session.delete(f"{API}/pois/{pid}", timeout=10)

    def test_update_poi_changes_canonical_facts(self, admin_session):
        payload = self._payload(uuid.uuid4().hex[:6])
        c = admin_session.post(f"{API}/pois", json=payload, timeout=15)
        assert c.status_code == 200, c.text
        pid = c.json()["id"]
        try:
            updated = {**payload, "canonical_facts": ["Only one fact now."]}
            u = admin_session.put(f"{API}/pois/{pid}", json=updated, timeout=15)
            assert u.status_code == 200, u.text
            g = requests.get(f"{API}/pois/{pid}", timeout=10).json()
            assert g["canonical_facts"] == ["Only one fact now."]
        finally:
            admin_session.delete(f"{API}/pois/{pid}", timeout=10)

    def test_canonical_facts_defaults_to_empty_list_when_omitted(self, admin_session):
        payload = self._payload(uuid.uuid4().hex[:6])
        payload.pop("canonical_facts", None)
        r = admin_session.post(f"{API}/pois", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        pid = body["id"]
        try:
            assert body.get("canonical_facts") == []
            g = requests.get(f"{API}/pois/{pid}", timeout=10).json()
            assert g.get("canonical_facts") == []
        finally:
            admin_session.delete(f"{API}/pois/{pid}", timeout=10)
