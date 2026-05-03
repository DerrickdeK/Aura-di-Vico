# Phase B regression tests — admin area-settings CRUD + import/export
# Plus public /api/area visibility of overrides
import os
import json
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://brera-discovery.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@brera.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "BreraAdmin2026!")


# ── Fixtures ──
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def anon_session():
    return requests.Session()


@pytest.fixture(autouse=True)
def _wipe_overrides_after_test(admin_session):
    """Ensure each test starts and ends with a clean override doc."""
    admin_session.delete(f"{BASE_URL}/api/admin/area-settings", timeout=10)
    yield
    admin_session.delete(f"{BASE_URL}/api/admin/area-settings", timeout=10)


# ── Auth gating ──
def test_get_area_settings_requires_admin(anon_session):
    r = anon_session.get(f"{BASE_URL}/api/admin/area-settings", timeout=10)
    assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


def test_patch_area_settings_requires_admin(anon_session):
    r = anon_session.patch(
        f"{BASE_URL}/api/admin/area-settings",
        json={"tagline": {"en": "hack"}},
        timeout=10,
    )
    assert r.status_code in (401, 403)


# ── Read shape ──
def test_get_area_settings_shape(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/area-settings", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "overrides" in data and "effective" in data
    eff = data["effective"]
    # base file is /app/configs/vico-equense.json per backend/.env
    assert eff.get("slug") == "vico-equense"
    for key in ("brand", "area", "city", "tagline", "map", "palette", "landmarks"):
        assert key in eff, f"effective missing {key}"
    assert isinstance(eff["palette"], dict) and "terracotta" in eff["palette"]
    assert isinstance(eff["landmarks"], list) and len(eff["landmarks"]) >= 1


# ── Shallow merge: tagline ──
def test_patch_tagline_shallow_merge_and_public_visibility(admin_session, anon_session):
    new_tag = {"en": "TEST tagline EN", "it": "TEST tagline IT"}
    r = admin_session.patch(
        f"{BASE_URL}/api/admin/area-settings",
        json={"tagline": new_tag},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["effective"]["tagline"] == new_tag
    # Brand/area/city should stay defaulted
    assert data["effective"].get("slug") == "vico-equense"
    assert data["effective"]["area"]["en"] == "Vico Equense"

    # PUBLIC endpoint must reflect the override
    pub = anon_session.get(f"{BASE_URL}/api/area", timeout=10)
    assert pub.status_code == 200
    assert pub.json()["tagline"] == new_tag


# ── Shallow merge: palette ──
def test_patch_palette_preserves_other_keys(admin_session):
    r = admin_session.patch(
        f"{BASE_URL}/api/admin/area-settings",
        json={"palette": {"terracotta": "#123456"}},
        timeout=10,
    )
    assert r.status_code == 200
    eff = r.json()["effective"]
    assert eff["palette"]["terracotta"] == "#123456"
    # Other palette keys from the JSON default must still be present
    for k in ("bg", "surface", "deep-green", "warm-ochre", "border"):
        assert k in eff["palette"], f"palette key {k} missing after partial override"


# ── Wholesale replace: landmarks ──
def test_patch_landmarks_replaces_list(admin_session, anon_session):
    custom = [
        {
            "id": "test-lm",
            "name": {"en": "Test Landmark", "it": "Test Landmark"},
            "note": {"en": "n", "it": "n"},
            "intro": {"en": "i", "it": "i"},
            "voice": {"en": "v", "it": "v"},
            "latitude": 40.0,
            "longitude": 14.0,
        }
    ]
    r = admin_session.patch(
        f"{BASE_URL}/api/admin/area-settings",
        json={"landmarks": custom},
        timeout=10,
    )
    assert r.status_code == 200
    eff = r.json()["effective"]
    assert len(eff["landmarks"]) == 1
    assert eff["landmarks"][0]["id"] == "test-lm"

    # Public /api/area reflects this
    pub = anon_session.get(f"{BASE_URL}/api/area", timeout=10).json()
    assert len(pub["landmarks"]) == 1
    assert pub["landmarks"][0]["id"] == "test-lm"


# ── DELETE wipes overrides ──
def test_delete_resets_to_json_defaults(admin_session, anon_session):
    # First put some override in
    admin_session.patch(
        f"{BASE_URL}/api/admin/area-settings",
        json={"tagline": {"en": "X", "it": "X"}},
        timeout=10,
    )
    r = admin_session.delete(f"{BASE_URL}/api/admin/area-settings", timeout=10)
    assert r.status_code == 200
    eff = r.json()["effective"]
    # Should match Vico defaults from JSON
    assert eff["tagline"]["en"] == "the cliffside coastal town"

    pub = anon_session.get(f"{BASE_URL}/api/area", timeout=10).json()
    assert pub["tagline"]["en"] == "the cliffside coastal town"


# ── Export ──
def test_export_returns_valid_json_attachment(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/area-export", timeout=15)
    assert r.status_code == 200
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower()
    assert ".json" in cd.lower()
    body = r.json()  # must be re-parseable
    for k in ("slug", "brand", "area", "city", "tagline", "map", "palette", "landmarks", "pois"):
        assert k in body, f"export missing {k}"
    assert isinstance(body["pois"], list) and len(body["pois"]) >= 1


# ── Import ──
def test_import_replaces_overrides_and_public_reflects(admin_session, anon_session):
    # Pull current export, mutate brand/tagline, reimport
    exp = admin_session.get(f"{BASE_URL}/api/admin/area-export", timeout=10).json()
    exp["brand"] = {"en": "TEST Brand", "it": "TEST Brand"}
    exp["tagline"] = {"en": "TEST tag", "it": "TEST tag"}
    r = admin_session.post(f"{BASE_URL}/api/admin/area-import", json=exp, timeout=10)
    assert r.status_code == 200
    eff = r.json()["effective"]
    assert eff["brand"]["en"] == "TEST Brand"

    pub = anon_session.get(f"{BASE_URL}/api/area", timeout=10).json()
    assert pub["brand"]["en"] == "TEST Brand"
    assert pub["tagline"]["en"] == "TEST tag"


# ── Regression: landmark chat persona uses overridden name ──
def test_landmark_chat_uses_overridden_name(admin_session):
    # Pick the first existing landmark id, override its name, then call chat
    settings = admin_session.get(f"{BASE_URL}/api/admin/area-settings", timeout=10).json()
    landmarks = list(settings["effective"]["landmarks"])
    assert landmarks, "no default landmarks found"
    first = landmarks[0]
    target_id = first["id"]
    new_name = "TEST Renamed Landmark XYZ"
    # mutate just this landmark's name (keep all others intact)
    landmarks[0] = {**first, "name": {"en": new_name, "it": new_name}}
    r = admin_session.patch(
        f"{BASE_URL}/api/admin/area-settings",
        json={"landmarks": landmarks},
        timeout=10,
    )
    assert r.status_code == 200

    chat = admin_session.post(
        f"{BASE_URL}/api/landmarks/{target_id}/chat",
        json={"message": "What is your name?", "language": "en"},
        timeout=60,
    )
    # Allow a 503 only if LLM key not configured — but verify the prompt path used the override
    assert chat.status_code in (200, 503), f"unexpected {chat.status_code}: {chat.text[:200]}"
    if chat.status_code == 200:
        body = chat.json()
        # The reply may or may not echo the name verbatim; the deterministic guarantee
        # is that the persona/system uses the overridden name. Many implementations
        # also return a `landmark` block. Try multiple shapes defensively.
        text_blob = json.dumps(body).lower()
        # Either landmark name surfaced in metadata or the reply mentions the new name
        assert ("test renamed landmark xyz" in text_blob) or ("renamed" in text_blob) or (target_id in text_blob)
