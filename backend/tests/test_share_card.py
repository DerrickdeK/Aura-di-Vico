"""Tests for the OG-tagged /api/share/{slug} HTML and /api/og-image/itineraries/{slug}.png."""
import io
import os
import requests
import pytest
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brera-discovery.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@brera.app")
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


@pytest.fixture(scope="module")
def gift_slug():
    s = requests.Session()
    s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    pois = requests.get(f"{API}/pois", timeout=10).json()
    poi_ids = [p["id"] for p in pois[:4]]
    r = s.post(f"{API}/itineraries", json={
        "sender_name": "Marco", "recipient_name": "Anna",
        "dedication": "Cara Anna…", "poi_ids": poi_ids, "language": "it",
    }, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["slug"]


class TestShareHTML:
    def test_share_returns_og_html(self, gift_slug):
        # Don't follow the meta-refresh — we want the raw HTML.
        r = requests.get(f"{API}/share/{gift_slug}", timeout=10, allow_redirects=False)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/html")
        body = r.text
        # Required OG tags for a rich unfurl
        assert 'property="og:title"' in body
        assert 'property="og:description"' in body
        assert 'property="og:image"' in body
        assert 'property="og:url"' in body
        assert 'property="og:image:width" content="1200"' in body
        assert 'property="og:image:height" content="630"' in body
        # Twitter-card variant
        assert 'name="twitter:card" content="summary_large_image"' in body
        # Personalised content
        assert "Marco" in body
        assert "Anna" in body
        # Redirect targets the SPA
        assert f"/gift/{gift_slug}" in body
        assert 'http-equiv="refresh"' in body

    def test_share_unknown_slug_404(self):
        r = requests.get(f"{API}/share/zzznosuch", timeout=10, allow_redirects=False)
        assert r.status_code == 404


class TestOGImage:
    def test_og_image_returns_png(self, gift_slug):
        r = requests.get(f"{API}/og-image/itineraries/{gift_slug}.png", timeout=15)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        # PNG magic header
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        # Right dimensions
        from PIL import Image
        img = Image.open(io.BytesIO(r.content))
        assert img.size == (1200, 630)
        assert img.mode == "RGB"

    def test_og_image_unknown_slug_404(self):
        r = requests.get(f"{API}/og-image/itineraries/zzznosuch.png", timeout=10)
        assert r.status_code == 404
