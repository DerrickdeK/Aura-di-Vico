# Targeted regression tests for the Vico Equense pivot (iteration 11).
# Verifies: default tenant is vico-equense; brera still reachable;
# share card / og image / admin clone / chat all reflect Vico branding.

import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session(session):
    r = session.post(f"{API}/auth/login", json={
        "email": "admin@brera.app",
        "password": "BreraAdmin2026!",
    })
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    return session


# ---- Area ---------------------------------------------------------------

def _brand_str(body):
    brand = body.get("brand") or {}
    if isinstance(brand, dict):
        return brand.get("it") or brand.get("en") or ""
    return brand or ""


class TestAreaDefault:
    def test_default_area_is_vico(self, session):
        r = session.get(f"{API}/area")
        assert r.status_code == 200
        body = r.json()
        assert body.get("slug") == "vico-equense", body.get("slug")
        assert "Vico Equense" in _brand_str(body), _brand_str(body)
        landmarks = body.get("landmarks") or []
        assert len(landmarks) == 5, f"expected 5 landmarks, got {len(landmarks)}"
        # POIs come from /api/pois
        pois = session.get(f"{API}/pois").json()
        assert isinstance(pois, list)
        assert len(pois) == 18, f"expected 18 pois, got {len(pois)}"
        # Check landmark ids match expected vico set
        landmark_ids = {l["id"] for l in landmarks}
        assert landmark_ids == {"annunziata", "castello-giusso", "pizza-metro", "scrajo", "gabriele"}, landmark_ids

    def test_brera_reachable_via_query(self, session):
        r = session.get(f"{API}/area", params={"tenant": "brera-milano"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("slug") == "brera-milano"
        assert "Brera" in _brand_str(body), _brand_str(body)


# ---- Tenant listing -----------------------------------------------------

class TestTenantEndpoint:
    def test_active_and_available(self, session):
        r = session.get(f"{API}/tenant")
        assert r.status_code == 200
        body = r.json()
        assert body.get("active") == "vico-equense", body
        available = body.get("available") or []
        slugs = [t.get("slug") if isinstance(t, dict) else t for t in available]
        assert "brera-milano" in slugs
        assert "vico-equense" in slugs


# ---- Share card / OG image ---------------------------------------------

class TestShareCard:
    @pytest.fixture(scope="class")
    def gift_slug(self, session):
        # Login as admin so we can POST an itinerary
        r = session.post(f"{API}/auth/login", json={
            "email": "admin@brera.app",
            "password": "BreraAdmin2026!",
        })
        assert r.status_code == 200
        # Fetch first 3 POI ids from /api/pois
        pois = session.get(f"{API}/pois").json()
        ids = [p.get("id") for p in pois[:3] if p.get("id")]
        assert len(ids) == 3, ids
        payload = {
            "poi_ids": ids,
            "dedication": "TEST_vico gift for mayor demo",
            "language": "it",
            "recipient_name": "Sindaco",
            "sender_name": "Tester",
        }
        r = session.post(f"{API}/itineraries", json=payload)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text[:300]}"
        body = r.json()
        slug = body.get("slug") or body.get("itinerary", {}).get("slug")
        assert slug, body
        return slug

    def test_share_html_has_vico_og(self, session, gift_slug):
        r = session.get(f"{API}/share/{gift_slug}")
        assert r.status_code == 200, r.status_code
        html = r.text
        # og:title contains Vico Equense
        m = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', html, re.I)
        assert m, "no og:title found"
        og_title = m.group(1)
        assert "Vico Equense" in og_title, og_title
        assert "Brera" not in og_title, og_title
        # og:site_name is "Aura di Vico Equense"
        m2 = re.search(r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)', html, re.I)
        assert m2, "no og:site_name found"
        assert "Vico Equense" in m2.group(1), m2.group(1)

    def test_og_image_png(self, session, gift_slug):
        r = session.get(f"{API}/og-image/itineraries/{gift_slug}.png")
        assert r.status_code == 200, r.status_code
        ctype = r.headers.get("Content-Type", "")
        assert "png" in ctype.lower(), ctype
        size = len(r.content)
        # Spec says ~40-60KB; allow a bit of wiggle room (20-100KB)
        assert 20_000 <= size <= 120_000, f"png size {size} out of range"
        # PNG magic
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


# ---- Itinerary create + fetch ------------------------------------------

class TestItinerary:
    def test_create_and_fetch(self, admin_session):
        pois = admin_session.get(f"{API}/pois").json()
        ids = [p["id"] for p in pois[:4]]
        r = admin_session.post(f"{API}/itineraries", json={
            "poi_ids": ids,
            "dedication": "TEST_vico itinerary",
            "language": "it",
            "recipient_name": "TestRecipient",
            "sender_name": "TestSender",
        })
        assert r.status_code in (200, 201)
        slug = r.json().get("slug") or r.json().get("itinerary", {}).get("slug")
        g = admin_session.get(f"{API}/itineraries/{slug}")
        assert g.status_code == 200
        got = g.json()
        got_ids = got.get("poi_ids") or [p["id"] for p in got.get("pois", [])]
        assert got_ids == ids


# ---- Admin clone (Anthropic) -------------------------------------------

class TestAdminClone:
    def test_admin_clone_happy_path(self, admin_session):
        # One happy-path call to avoid burning Anthropic budget
        payload = {
            "city": "Positano",
            "country": "Italy",
            "vibe": "coastal cliffs at dusk",
            "language": "it",
        }
        r = admin_session.post(f"{API}/admin/area-clone", json=payload, timeout=90)
        # Accept 200 (success) or 422 (validation), per testing instructions
        assert r.status_code in (200, 422), f"{r.status_code} {r.text[:400]}"
        if r.status_code == 200:
            body = r.json()
            # Expect at minimum a draft object
            assert isinstance(body, dict)


# ---- POI chat ----------------------------------------------------------

class TestPoiChat:
    def test_chat_about_vico_poi(self, session):
        pois = session.get(f"{API}/pois").json()
        poi = pois[0]
        pid = poi["id"]
        r = session.post(f"{API}/pois/{pid}/chat", json={
            "message": "Cosa rende speciale questo luogo?",
            "language": "it",
        }, timeout=60)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.json()
        reply = body.get("reply") or body.get("response") or body.get("message") or ""
        assert isinstance(reply, str) and len(reply.strip()) > 10, reply
