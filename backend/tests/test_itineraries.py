"""Tests for /api/itineraries — gift-a-walk feature.
Covers: create (auth required), public read with view_count bump, list-mine,
delete-own-only, validation (3-8 POIs, dedupe, unknown POI ids), no _id leak.
"""
import os
import uuid
import requests
import pytest
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pickup-progress-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@brera.app")
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def fresh_user_session():
    email = f"TEST_gift_{uuid.uuid4().hex[:8]}@example.com"
    s = requests.Session()
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "Sekret123!", "name": "Gift Tester"},
               timeout=15)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def some_poi_ids():
    r = requests.get(f"{API}/pois", timeout=10)
    assert r.status_code == 200
    pois = r.json()
    assert len(pois) >= 8, "need >=8 seeded POIs to test gift CRUD"
    return [p["id"] for p in pois[:8]]


class TestItineraryCreate:
    def test_unauth_create_rejected(self, some_poi_ids):
        r = requests.post(f"{API}/itineraries", json={
            "sender_name": "X", "recipient_name": "Y",
            "dedication": "hi", "poi_ids": some_poi_ids[:3], "language": "it",
        }, timeout=10)
        assert r.status_code == 401

    def test_create_happy_path_returns_slug(self, admin_session, some_poi_ids):
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "Marco", "recipient_name": "Anna",
            "dedication": "Welcome to Brera", "poi_ids": some_poi_ids[:5], "language": "en",
        }, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["slug"] and 4 <= len(body["slug"]) <= 12
        assert body["recipient_name"] == "Anna"
        assert body["language"] == "en"
        assert body["view_count"] == 0
        assert body["poi_ids"] == some_poi_ids[:5]
        assert "_id" not in body

    def test_too_few_pois_rejected(self, admin_session, some_poi_ids):
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "M", "recipient_name": "A",
            "dedication": "hi", "poi_ids": some_poi_ids[:2], "language": "it",
        }, timeout=10)
        assert r.status_code in (400, 422)

    def test_too_many_pois_rejected(self, admin_session, some_poi_ids):
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "M", "recipient_name": "A",
            "dedication": "hi",
            "poi_ids": some_poi_ids + [some_poi_ids[0]] * 5,  # 13 total
            "language": "it",
        }, timeout=10)
        assert r.status_code in (400, 422)

    def test_unknown_poi_id_rejected(self, admin_session, some_poi_ids):
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "M", "recipient_name": "A",
            "dedication": "hi",
            "poi_ids": some_poi_ids[:2] + ["does-not-exist-123"],
            "language": "it",
        }, timeout=10)
        assert r.status_code == 400

    def test_dedupe_collapses_duplicates_to_one(self, admin_session, some_poi_ids):
        # 3 unique + 2 duplicates → server should collapse to 3 unique and accept.
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "M", "recipient_name": "A",
            "dedication": "hi",
            "poi_ids": some_poi_ids[:3] + [some_poi_ids[0], some_poi_ids[1]],
            "language": "it",
        }, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["poi_ids"] == some_poi_ids[:3]


class TestItineraryRead:
    def test_public_read_increments_view_count(self, admin_session, some_poi_ids):
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "M", "recipient_name": "A",
            "dedication": "Walk slowly.", "poi_ids": some_poi_ids[:4], "language": "en",
        }, timeout=10)
        slug = r.json()["slug"]
        # Anonymous client must be able to read it
        anon = requests.Session()
        r1 = anon.get(f"{API}/itineraries/{slug}", timeout=10)
        assert r1.status_code == 200
        body1 = r1.json()
        assert body1["recipient_name"] == "A"
        assert len(body1["pois"]) == 4
        assert "_id" not in body1
        assert all("_id" not in p for p in body1["pois"])
        # Second hit should show one extra view
        r2 = anon.get(f"{API}/itineraries/{slug}", timeout=10)
        assert r2.json()["view_count"] >= body1["view_count"] + 1

    def test_unknown_slug_404(self):
        r = requests.get(f"{API}/itineraries/zzznosuch", timeout=10)
        assert r.status_code == 404


class TestItineraryListAndDelete:
    def test_list_mine_only_returns_mine(self, admin_session, fresh_user_session, some_poi_ids):
        # admin creates one
        admin_session.post(f"{API}/itineraries", json={
            "sender_name": "Admin", "recipient_name": "Friend",
            "dedication": "x", "poi_ids": some_poi_ids[:3], "language": "it",
        }, timeout=10)
        # fresh_user lists their own — must be empty (they haven't made any)
        r = fresh_user_session.get(f"{API}/me/itineraries", timeout=10)
        assert r.status_code == 200
        assert r.json() == []

    def test_delete_other_users_gift_forbidden(self, admin_session, fresh_user_session, some_poi_ids):
        # admin creates a gift, fresh_user tries to delete it → 403
        r = admin_session.post(f"{API}/itineraries", json={
            "sender_name": "Admin", "recipient_name": "Friend",
            "dedication": "x", "poi_ids": some_poi_ids[:3], "language": "it",
        }, timeout=10)
        gid = r.json()["id"]
        r2 = fresh_user_session.delete(f"{API}/itineraries/{gid}", timeout=10)
        assert r2.status_code == 403
        # owner can delete
        r3 = admin_session.delete(f"{API}/itineraries/{gid}", timeout=10)
        assert r3.status_code == 200
