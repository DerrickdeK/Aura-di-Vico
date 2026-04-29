"""
Brera Discover backend regression tests.
Covers: POI listing/detail, auth (register/login/me/logout/refresh), admin POI CRUD,
reset/seed, favorites, visits (with duplicate window), brute-force lockout, and _id leak guard.
"""
import os
import time
import uuid
import requests
import pytest
from dotenv import load_dotenv
from pathlib import Path

# Load credentials from the backend .env (gitignored) instead of hardcoding them.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pickup-progress-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@brera.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError(
        "ADMIN_PASSWORD must be provided via environment for the test run "
        "(it is read from /app/backend/.env at runtime, but tests should pass it explicitly)."
    )


# ---------------------- Fixtures ----------------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("role") == "admin"
    return s


@pytest.fixture(scope="session")
def normal_user_session():
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPass2026!"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "Test User"}, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email
    s.password = pwd
    return s


# ---------------------- Module: Health & POIs (public) ----------------------
class TestPublicPOIs:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_list_pois_seeded(self):
        r = requests.get(f"{API}/pois", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # spec says ~18 seeded POIs
        assert len(data) >= 18, f"Expected >=18 seeded POIs, got {len(data)}"
        sample = data[0]
        for k in ["id", "name", "latitude", "longitude", "address", "category", "image_url", "trigger_radius_m"]:
            assert k in sample, f"POI missing key {k}"
        # No mongo _id leaked
        for p in data:
            assert "_id" not in p

    def test_get_single_poi(self):
        listing = requests.get(f"{API}/pois", timeout=15).json()
        target = listing[0]
        r = requests.get(f"{API}/pois/{target['id']}", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == target["id"]
        assert "_id" not in body

    def test_get_poi_not_found(self):
        r = requests.get(f"{API}/pois/does-not-exist-xyz", timeout=10)
        assert r.status_code == 404


# ---------------------- Module: Auth ----------------------
class TestAuth:
    def test_admin_login_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert body["role"] == "admin"
        assert "access_token" in s.cookies, f"no access_token cookie set, cookies={dict(s.cookies)}"
        assert "refresh_token" in s.cookies

    def test_me_with_cookies(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert body["role"] == "admin"
        assert "_id" not in body
        assert "password_hash" not in body

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_refresh_with_valid_refresh_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        # remove access cookie - keep refresh
        s.cookies.pop("access_token", None)
        # ensure refresh issues a NEW token by waiting a second so exp changes
        time.sleep(1.2)
        r = s.post(f"{API}/auth/refresh", timeout=10)
        assert r.status_code == 200
        assert s.cookies.get("access_token")
        # Use cookie to call /me successfully
        me = s.get(f"{API}/auth/me", timeout=10)
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN_EMAIL

    def test_register_user_sets_cookies(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Sekret123!", "name": "Reg User"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == email.lower()
        assert body["role"] == "user"
        assert body["favorites"] == []
        assert "access_token" in s.cookies

    def test_register_duplicate_email(self, normal_user_session):
        r = requests.post(f"{API}/auth/register",
                          json={"email": normal_user_session.email, "password": "Whatever123", "name": "Dup"},
                          timeout=15)
        assert r.status_code == 400

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200
        # subsequent /me should be 401
        r2 = s.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 401


# ---------------------- Module: Brute-force ----------------------
class TestBruteForce:
    def test_5_wrong_then_429(self):
        # use an isolated identifier so we don't conflict
        email = f"TEST_bf_{uuid.uuid4().hex[:8]}@example.com"
        # register first so that response is 401 (wrong password) not 401(no user)
        requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "Correct123!", "name": "BF"}, timeout=15)
        last_status = None
        for _ in range(6):
            r = requests.post(f"{API}/auth/login",
                              json={"email": email, "password": "WRONG_PASS"}, timeout=10)
            last_status = r.status_code
        assert last_status == 429, f"Expected 429 after 5 fails, got {last_status}"


# ---------------------- Module: Admin POI CRUD ----------------------
class TestAdminPOIs:
    @pytest.fixture
    def temp_poi(self, admin_session):
        payload = {
            "name": "TEST_POI_" + uuid.uuid4().hex[:6],
            "short_description": "tmp",
            "long_description": "tmp long",
            "latitude": 45.4720, "longitude": 9.1880,
            "address": "Brera test",
            "category": "Test",
            "image_url": "https://example.com/x.jpg",
            "trigger_radius_m": 50,
            "hours": "24/7",
            "fun_fact": "Created by automated test",
        }
        r = admin_session.post(f"{API}/pois", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        poi = r.json()
        yield poi
        admin_session.delete(f"{API}/pois/{poi['id']}", timeout=10)

    def test_create_requires_admin(self, normal_user_session):
        r = normal_user_session.post(f"{API}/pois",
                                     json={"name": "x", "short_description": "x", "long_description": "x",
                                           "latitude": 0, "longitude": 0, "address": "x", "category": "x",
                                           "image_url": "https://x.example/x.jpg"}, timeout=10)
        assert r.status_code == 403

    def test_create_unauth_returns_401(self):
        r = requests.post(f"{API}/pois", json={"name": "x"}, timeout=10)
        assert r.status_code in (401, 422)

    def test_update_poi(self, admin_session, temp_poi):
        new_name = temp_poi["name"] + "_EDITED"
        body = {**temp_poi, "name": new_name}
        body.pop("id", None)
        r = admin_session.put(f"{API}/pois/{temp_poi['id']}", json=body, timeout=15)
        assert r.status_code == 200
        # GET to verify persistence
        g = requests.get(f"{API}/pois/{temp_poi['id']}", timeout=10)
        assert g.status_code == 200
        assert g.json()["name"] == new_name

    def test_delete_poi(self, admin_session):
        # create independently
        payload = {
            "name": "TEST_DEL_" + uuid.uuid4().hex[:6],
            "short_description": "d", "long_description": "d",
            "latitude": 45.47, "longitude": 9.18, "address": "x", "category": "x",
            "image_url": "https://x/x.jpg",
        }
        c = admin_session.post(f"{API}/pois", json=payload, timeout=10)
        pid = c.json()["id"]
        d = admin_session.delete(f"{API}/pois/{pid}", timeout=10)
        assert d.status_code == 200
        g = requests.get(f"{API}/pois/{pid}", timeout=10)
        assert g.status_code == 404

    def test_reset_and_reseed(self, admin_session):
        # reset wipes all
        r = admin_session.post(f"{API}/pois/reset", timeout=20)
        assert r.status_code == 200
        listing = requests.get(f"{API}/pois", timeout=15).json()
        assert listing == []
        # seed re-inserts defaults
        r2 = admin_session.post(f"{API}/pois/seed", timeout=30)
        assert r2.status_code == 200
        body = r2.json()
        assert body["inserted"] >= 18
        listing2 = requests.get(f"{API}/pois", timeout=15).json()
        assert len(listing2) >= 18

    def test_seed_idempotent_when_not_empty(self, admin_session):
        r = admin_session.post(f"{API}/pois/seed", timeout=15)
        assert r.status_code == 200
        # Should be 0 inserted because collection is non-empty
        assert r.json()["inserted"] == 0


# ---------------------- Module: Favorites ----------------------
class TestFavorites:
    def test_add_get_delete_favorite(self, normal_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[0]["id"]
        r = normal_user_session.post(f"{API}/me/favorites/{pid}", timeout=10)
        assert r.status_code == 200
        g = normal_user_session.get(f"{API}/me/favorites", timeout=10)
        assert g.status_code == 200
        assert any(p["id"] == pid for p in g.json())
        d = normal_user_session.delete(f"{API}/me/favorites/{pid}", timeout=10)
        assert d.status_code == 200
        g2 = normal_user_session.get(f"{API}/me/favorites", timeout=10)
        assert all(p["id"] != pid for p in g2.json())

    def test_add_favorite_unknown_poi(self, normal_user_session):
        r = normal_user_session.post(f"{API}/me/favorites/no-such-id", timeout=10)
        assert r.status_code == 404


# ---------------------- Module: Visits ----------------------
class TestVisits:
    def test_record_visit_and_duplicate(self, normal_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[1]["id"]
        r1 = normal_user_session.post(f"{API}/me/visits", json={"poi_id": pid}, timeout=10)
        assert r1.status_code == 200
        # duplicate within 6h
        r2 = normal_user_session.post(f"{API}/me/visits", json={"poi_id": pid}, timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True

    def test_list_visits_includes_poi(self, normal_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[2]["id"]
        normal_user_session.post(f"{API}/me/visits", json={"poi_id": pid}, timeout=10)
        r = normal_user_session.get(f"{API}/me/visits", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(v.get("poi") and v["poi"]["id"] == pid for v in data)
        for v in data:
            assert "_id" not in v
            if v.get("poi"):
                assert "_id" not in v["poi"]

    def test_visit_unknown_poi(self, normal_user_session):
        r = normal_user_session.post(f"{API}/me/visits", json={"poi_id": "ghost"}, timeout=10)
        assert r.status_code == 404


# ---------------------- Module: Iteration 2 - Config endpoint ----------------------
class TestConfig:
    def test_config_shape(self):
        r = requests.get(f"{API}/config", timeout=10)
        assert r.status_code == 200
        body = r.json()
        # languages: 7 codes including required ones
        langs = body.get("supported_languages")
        assert isinstance(langs, list)
        for code in ["en", "it", "es", "de", "el", "fr", "pt"]:
            assert code in langs, f"language {code} missing from {langs}"
        # interest tags
        tags = body.get("interest_tags")
        assert isinstance(tags, list)
        for tag in ["local_legends", "curios", "art", "history",
                    "architecture", "sceneries", "food", "shopping"]:
            assert tag in tags
        assert len(tags) == 8
        # zone radii
        z = body.get("zones") or {}
        assert z.get("sensed_radius_m") == 200
        assert z.get("called_radius_m") == 80
        assert z.get("found_radius_m") == 25


# ---------------------- Module: Iteration 2 - POI new fields ----------------------
class TestPOINewFields:
    def test_pois_have_opening_line_and_interests(self):
        r = requests.get(f"{API}/pois", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for p in data:
            assert "opening_line" in p, f"POI {p.get('name')} missing opening_line"
            assert isinstance(p["opening_line"], dict)
            # at least one POI should have 'en'
            assert "interest_tags" in p
            assert isinstance(p["interest_tags"], list)
        # check at least one has en opening_line and tags
        with_en = [p for p in data if p["opening_line"].get("en")]
        assert len(with_en) >= 10, f"Expected >=10 POIs with English opening_line, got {len(with_en)}"
        with_tags = [p for p in data if p["interest_tags"]]
        assert len(with_tags) >= 10


# ---------------------- Module: Iteration 2 - Profile PATCH ----------------------
class TestProfile:
    def test_admin_me_has_new_fields(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "interests" in body
        assert "language" in body
        assert "onboarded" in body
        assert "notifications_enabled" in body
        # Admin is auto-onboarded per migration
        assert body["onboarded"] is True
        assert isinstance(body["interests"], list)

    def test_patch_profile_updates_all_fields(self, normal_user_session):
        payload = {
            "language": "it",
            "interests": ["history", "art", "food"],
            "notifications_enabled": True,
            "onboarded": True,
        }
        r = normal_user_session.patch(f"{API}/me/profile", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["language"] == "it"
        assert sorted(body["interests"]) == sorted(payload["interests"])
        assert body["notifications_enabled"] is True
        assert body["onboarded"] is True
        # Verify persistence via /auth/me
        m = normal_user_session.get(f"{API}/auth/me", timeout=10)
        assert m.status_code == 200
        mb = m.json()
        assert mb["language"] == "it"
        assert mb["onboarded"] is True

    def test_patch_profile_rejects_unknown_interest(self, normal_user_session):
        r = normal_user_session.patch(
            f"{API}/me/profile",
            json={"interests": ["local_legends", "definitely_not_a_tag"]},
            timeout=10,
        )
        assert r.status_code == 400

    def test_patch_profile_rejects_unsupported_language(self, normal_user_session):
        r = normal_user_session.patch(
            f"{API}/me/profile", json={"language": "zz"}, timeout=10,
        )
        assert r.status_code == 400

    def test_patch_profile_unauthenticated(self):
        r = requests.patch(f"{API}/me/profile", json={"language": "en"}, timeout=10)
        assert r.status_code == 401


# ---------------------- Module: Iteration 2 - Discoveries ----------------------
class TestDiscoveries:
    @pytest.fixture
    def fresh_user_session(self):
        email = f"TEST_disc_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": "Sekret123!", "name": "Disc User"},
                   timeout=15)
        assert r.status_code == 200
        return s

    def test_create_sensed_discovery(self, fresh_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[0]["id"]
        r = fresh_user_session.post(f"{API}/me/discoveries",
                                    json={"poi_id": pid, "zone": "sensed"}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["upgraded"] is False

    def test_upgrade_zone_returns_upgraded_true(self, fresh_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[0]["id"]
        # sensed
        fresh_user_session.post(f"{API}/me/discoveries",
                                json={"poi_id": pid, "zone": "sensed"}, timeout=10)
        # called -> upgrade
        r = fresh_user_session.post(f"{API}/me/discoveries",
                                    json={"poi_id": pid, "zone": "called"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["upgraded"] is True
        # found -> further upgrade
        r2 = fresh_user_session.post(f"{API}/me/discoveries",
                                     json={"poi_id": pid, "zone": "found"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["upgraded"] is True
        # GET should return zone=found, single record (not duplicates)
        listing = fresh_user_session.get(f"{API}/me/discoveries", timeout=10).json()
        matches = [d for d in listing if d.get("poi") and d["poi"]["id"] == pid]
        assert len(matches) == 1, f"Expected 1 discovery for POI, got {len(matches)}"
        assert matches[0]["zone"] == "found"

    def test_no_downgrade(self, fresh_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[1]["id"]
        # found first
        fresh_user_session.post(f"{API}/me/discoveries",
                                json={"poi_id": pid, "zone": "found"}, timeout=10)
        # sensed should not downgrade
        r = fresh_user_session.post(f"{API}/me/discoveries",
                                    json={"poi_id": pid, "zone": "sensed"}, timeout=10)
        assert r.status_code == 200
        listing = fresh_user_session.get(f"{API}/me/discoveries", timeout=10).json()
        matches = [d for d in listing if d.get("poi") and d["poi"]["id"] == pid]
        assert len(matches) == 1
        assert matches[0]["zone"] == "found", "found should not downgrade to sensed"

    def test_same_zone_no_duplicate(self, fresh_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[2]["id"]
        fresh_user_session.post(f"{API}/me/discoveries",
                                json={"poi_id": pid, "zone": "called"}, timeout=10)
        fresh_user_session.post(f"{API}/me/discoveries",
                                json={"poi_id": pid, "zone": "called"}, timeout=10)
        listing = fresh_user_session.get(f"{API}/me/discoveries", timeout=10).json()
        matches = [d for d in listing if d.get("poi") and d["poi"]["id"] == pid]
        assert len(matches) == 1

    def test_discoveries_list_embeds_poi(self, fresh_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[3]["id"]
        fresh_user_session.post(f"{API}/me/discoveries",
                                json={"poi_id": pid, "zone": "sensed"}, timeout=10)
        r = fresh_user_session.get(f"{API}/me/discoveries", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for d in data:
            assert "zone" in d
            assert d["zone"] in ("sensed", "called", "found")
            assert "poi" in d and d["poi"] is not None
            assert "_id" not in d
            assert "_id" not in d["poi"]
            assert "opening_line" in d["poi"]

    def test_unknown_poi_404(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/me/discoveries",
                                    json={"poi_id": "no-such", "zone": "sensed"}, timeout=10)
        assert r.status_code == 404

    def test_invalid_zone_422(self, fresh_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[0]["id"]
        r = fresh_user_session.post(f"{API}/me/discoveries",
                                    json={"poi_id": pid, "zone": "wandering"}, timeout=10)
        assert r.status_code == 422


# ---------------------- Module: Iteration 2 - Admin POI new fields persist ----------------------
class TestAdminPOIIter2:
    def test_create_with_opening_line_and_tags(self, admin_session):
        payload = {
            "name": "TEST_I2_" + uuid.uuid4().hex[:6],
            "short_description": "tmp",
            "long_description": "tmp long",
            "latitude": 45.4720, "longitude": 9.1880,
            "address": "Brera test",
            "category": "Test",
            "image_url": "https://example.com/x.jpg",
            "trigger_radius_m": 50,
            "interest_tags": ["local_legends", "food"],
            "opening_line": {
                "en": "Quiet, the gate is just here.",
                "it": "Silenzio, il cancello è qui.",
            },
        }
        r = admin_session.post(f"{API}/pois", json=payload, timeout=15)
        assert r.status_code == 200
        body = r.json()
        pid = body["id"]
        try:
            assert body["interest_tags"] == ["local_legends", "food"]
            assert body["opening_line"]["en"].startswith("Quiet")
            assert body["opening_line"]["it"].startswith("Silenzio")
            # GET back
            g = requests.get(f"{API}/pois/{pid}", timeout=10).json()
            assert g["interest_tags"] == ["local_legends", "food"]
            assert g["opening_line"]["it"] == payload["opening_line"]["it"]
        finally:
            admin_session.delete(f"{API}/pois/{pid}", timeout=10)

    def test_iter4_config_has_all_option_lists(self):
        r = requests.get(f"{API}/config", timeout=10)
        assert r.status_code == 200
        body = r.json()
        # 8 themes
        assert sorted(body["interest_tags"]) == sorted([
            "local_legends","curios","art","history","architecture","sceneries","food","shopping"
        ])
        # 7 supported languages
        assert sorted(body["supported_languages"]) == sorted(["en","it","es","de","el","fr","pt"])
        # New option lists must be present and well-formed
        assert body["relationship_modes"] == ["anonymous","personal"]
        assert sorted(body["status_options"]) == sorted(["citizen","visitor","guest","tourist","other"])
        assert sorted(body["gender_options"]) == sorted(["male","female","non_binary","prefer_not_to_say"])
        assert sorted(body["profession_options"]) == sorted([
            "student","researcher","employee","manual_craft",
            "self_employed_professional","retired","other"])
        assert sorted(body["companion_options"]) == sorted([
            "alone","with_partner","with_family","with_friends_or_group","with_guide"])
        assert sorted(body["accessibility_options"]) == sorted([
            "walking_freely","limited_stamina","wheelchair","stroller",
            "with_assistant","prefer_not_to_say"])
        assert sorted(body["response_formats"]) == sorted(["writing","voice","image","dialogue"])
        assert sorted(body["contribution_options"]) == sorted(["identify","illustrate","narrate","create_poi"])

    def test_iter4_pois_only_use_new_taxonomy(self):
        r = requests.get(f"{API}/pois", timeout=15)
        data = r.json()
        assert len(data) == 18, f"Expected exactly 18 POIs, got {len(data)}"
        valid = {"local_legends","curios","art","history","architecture","sceneries","food","shopping"}
        legacy = {"hidden_gardens","historic_cafes","hidden_courtyards",
                  "renaissance_traces","artisan_workshops"}
        for p in data:
            tags = p.get("interest_tags") or []
            assert tags, f"POI {p['name']} has no tags"
            for t in tags:
                assert t in valid, f"POI {p['name']} has invalid tag {t}"
                assert t not in legacy, f"POI {p['name']} still has legacy tag {t}"

    def test_iter4_profile_accepts_all_new_fields(self, normal_user_session):
        payload = {
            "relationship_mode":"personal",
            "status":"visitor",
            "gender":"non_binary",
            "profession":"other",
            "profession_other":"Astronaut",
            "companions":["alone","with_friends_or_group"],
            "accessibility":["wheelchair","prefer_not_to_say"],
            "response_formats":["writing","voice","image","dialogue"],
            "contribution_interests":["identify","illustrate","narrate","create_poi"],
        }
        r = normal_user_session.patch(f"{API}/me/profile", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["relationship_mode"] == "personal"
        assert body["status"] == "visitor"
        assert body["gender"] == "non_binary"
        assert body["profession"] == "other"
        assert body["profession_other"] == "Astronaut"
        assert sorted(body["companions"]) == sorted(payload["companions"])
        assert sorted(body["accessibility"]) == sorted(payload["accessibility"])
        assert sorted(body["response_formats"]) == sorted(payload["response_formats"])
        assert sorted(body["contribution_interests"]) == sorted(payload["contribution_interests"])
        # Verify persistence via /auth/me
        m = normal_user_session.get(f"{API}/auth/me", timeout=10).json()
        assert m["gender"] == "non_binary"
        assert m["profession_other"] == "Astronaut"
        assert "wheelchair" in m["accessibility"]

    @pytest.mark.parametrize("field,bad_value", [
        ("status", "alien"),
        ("gender", "robot"),
        ("profession", "wizard"),
        ("companions", ["with_dog"]),
        ("accessibility", ["jetpack"]),
        ("response_formats", ["telepathy"]),
        ("contribution_interests", ["destroy_poi"]),
    ])
    def test_iter4_profile_rejects_unknown_values(self, normal_user_session, field, bad_value):
        r = normal_user_session.patch(f"{API}/me/profile", json={field: bad_value}, timeout=10)
        assert r.status_code == 400, f"{field}={bad_value} should 400, got {r.status_code} {r.text}"

    def test_iter4_profile_rejects_legacy_interest_tag(self, normal_user_session):
        r = normal_user_session.patch(
            f"{API}/me/profile",
            json={"interests": ["hidden_gardens"]},
            timeout=10,
        )
        assert r.status_code == 400

    def test_update_changes_opening_line(self, admin_session):
        # create
        base = {
            "name": "TEST_I2U_" + uuid.uuid4().hex[:6],
            "short_description": "tmp", "long_description": "tmp",
            "latitude": 45.47, "longitude": 9.18, "address": "x", "category": "x",
            "image_url": "https://x/x.jpg",
            "interest_tags": ["history"],
            "opening_line": {"en": "v1"},
        }
        c = admin_session.post(f"{API}/pois", json=base, timeout=10)
        pid = c.json()["id"]
        try:
            updated = {**base, "opening_line": {"en": "v2", "fr": "bonjour"},
                       "interest_tags": ["curios"]}
            r = admin_session.put(f"{API}/pois/{pid}", json=updated, timeout=10)
            assert r.status_code == 200
            g = requests.get(f"{API}/pois/{pid}", timeout=10).json()
            assert g["opening_line"]["en"] == "v2"
            assert g["opening_line"]["fr"] == "bonjour"
            assert g["interest_tags"] == ["curios"]
        finally:
            admin_session.delete(f"{API}/pois/{pid}", timeout=10)



# ---------------------- Module: Iteration 5 - Contributions ----------------------
class TestContributions:
    @pytest.fixture(scope="class")
    def contributor_session(self):
        email = f"TEST_contrib_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": "Sekret123!", "name": "Contrib User",
                         "as_contributor": True}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["role"] == "contributor", f"expected contributor role, got {body.get('role')}"
        s.email = email
        return s

    @pytest.fixture(scope="class")
    def plain_user_session(self):
        email = f"TEST_plain_{uuid.uuid4().hex[:8]}@example.com"
        s = requests.Session()
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": "Sekret123!", "name": "Plain User"},
                   timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "user"
        return s

    def test_register_as_contributor_role(self, contributor_session):
        r = contributor_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["role"] == "contributor"

    def test_plain_user_cannot_post_contribution(self, plain_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        r = plain_user_session.post(f"{API}/contributions", json={
            "poi_id": pois[0]["id"], "type": "narrative",
            "content": "I am a plain user trying to contribute.",
        }, timeout=10)
        assert r.status_code == 403

    def test_contributor_creates_pending(self, contributor_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[0]["id"]
        r = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pid, "type": "narrative", "title": "TEST_n",
            "content": "Walking past, I noticed the iron gate creak in afternoon wind.",
        }, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending"
        assert body["poi_id"] == pid
        assert body["type"] == "narrative"
        assert "id" in body
        return body["id"]

    def test_admin_creates_auto_approved(self, admin_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[1]["id"]
        r = admin_session.post(f"{API}/contributions", json={
            "poi_id": pid, "type": "fun_fact",
            "content": "Admin-curated fact about this place.",
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

    def test_contributions_mine_returns_with_poi(self, contributor_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        contributor_session.post(f"{API}/contributions", json={
            "poi_id": pois[2]["id"], "type": "dialogue_prompt",
            "content": "What would you whisper to a 240-year-old tree?",
        }, timeout=10)
        r = contributor_session.get(f"{API}/contributions/mine", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        for c in data:
            assert "poi" in c
            assert c["poi"] is None or "name" in c["poi"]
            assert "_id" not in c

    def test_admin_list_filtered(self, admin_session):
        r = admin_session.get(f"{API}/contributions?status=pending", timeout=10)
        assert r.status_code == 200
        for c in r.json():
            assert c["status"] == "pending"

    def test_admin_list_unknown_status_400(self, admin_session):
        r = admin_session.get(f"{API}/contributions?status=foo", timeout=10)
        assert r.status_code == 400

    def test_plain_user_cannot_list_all(self, plain_user_session):
        r = plain_user_session.get(f"{API}/contributions", timeout=10)
        assert r.status_code == 403

    def test_unauth_cannot_list_all(self):
        r = requests.get(f"{API}/contributions", timeout=10)
        assert r.status_code == 401

    def test_moderation_approve_flow(self, contributor_session, admin_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[3]["id"]
        c = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pid, "type": "narrative", "content": "A short whisper to be approved."
        }, timeout=10).json()
        cid = c["id"]
        r = admin_session.patch(f"{API}/contributions/{cid}/moderate",
                                json={"status": "approved", "note": "looks good"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        # Public POI contributions should now include it
        public = requests.get(f"{API}/pois/{pid}/contributions", timeout=10)
        assert public.status_code == 200
        ids = [x["id"] for x in public.json()]
        assert cid in ids

    def test_moderation_reject_flow(self, contributor_session, admin_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[4]["id"]
        c = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pid, "type": "fun_fact", "content": "spam content to reject"
        }, timeout=10).json()
        cid = c["id"]
        r = admin_session.patch(f"{API}/contributions/{cid}/moderate",
                                json={"status": "rejected"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        public = requests.get(f"{API}/pois/{pid}/contributions", timeout=10).json()
        assert all(x["id"] != cid for x in public)

    def test_plain_user_cannot_moderate(self, contributor_session, plain_user_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        c = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pois[5]["id"], "type": "narrative", "content": "another whisper"
        }, timeout=10).json()
        r = plain_user_session.patch(f"{API}/contributions/{c['id']}/moderate",
                                     json={"status": "approved"}, timeout=10)
        assert r.status_code == 403

    def test_public_poi_contributions_only_approved(self, contributor_session, admin_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        pid = pois[6]["id"]
        # 2 pending + 1 approved
        pending = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pid, "type": "narrative", "content": "still pending"
        }, timeout=10).json()
        approved = admin_session.post(f"{API}/contributions", json={
            "poi_id": pid, "type": "narrative", "content": "auto approved"
        }, timeout=10).json()
        public = requests.get(f"{API}/pois/{pid}/contributions", timeout=10).json()
        ids = {c["id"] for c in public}
        assert approved["id"] in ids
        assert pending["id"] not in ids
        for c in public:
            assert c["status"] == "approved"

    def test_owner_can_delete_pending(self, contributor_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        c = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pois[7]["id"], "type": "fun_fact", "content": "to be deleted by owner"
        }, timeout=10).json()
        r = contributor_session.delete(f"{API}/contributions/{c['id']}", timeout=10)
        assert r.status_code == 200

    def test_owner_cannot_delete_approved(self, contributor_session, admin_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        c = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pois[8]["id"], "type": "narrative", "content": "will be approved"
        }, timeout=10).json()
        admin_session.patch(f"{API}/contributions/{c['id']}/moderate",
                            json={"status": "approved"}, timeout=10)
        r = contributor_session.delete(f"{API}/contributions/{c['id']}", timeout=10)
        assert r.status_code == 403
        # Admin can though
        r2 = admin_session.delete(f"{API}/contributions/{c['id']}", timeout=10)
        assert r2.status_code == 200

    def test_create_unknown_poi_404(self, contributor_session):
        r = contributor_session.post(f"{API}/contributions", json={
            "poi_id": "ghost-poi", "type": "narrative", "content": "nope"
        }, timeout=10)
        assert r.status_code == 404

    def test_invalid_type_422(self, contributor_session):
        pois = requests.get(f"{API}/pois", timeout=10).json()
        r = contributor_session.post(f"{API}/contributions", json={
            "poi_id": pois[0]["id"], "type": "graffiti", "content": "x"
        }, timeout=10)
        assert r.status_code == 422

    def test_public_poi_contributions_unknown_404(self):
        r = requests.get(f"{API}/pois/nope/contributions", timeout=10)
        assert r.status_code == 404
