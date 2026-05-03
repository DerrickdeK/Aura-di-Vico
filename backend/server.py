from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import logging
import secrets
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response as FastAPIResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from mailer import send_email, password_reset_email, contribution_moderated_email
from poi_chat import reply as poi_chat_reply
from safety import screen_contribution, VERDICT_BLOCK
from share_card import render_og_image, render_share_html
from area_config import (
    load_area as load_area_config,
    pois_seed as area_pois_seed,
    landmarks_dict as area_landmarks_dict,
    public_area as area_public_payload,
    merged_area as area_merged_payload,
    merged_landmarks_dict as area_merged_landmarks,
)


# ------------------------------------------------------------------------------------
# DB & app setup
# ------------------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Aura Discover API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 24h for friendlier walking-session UX
REFRESH_TOKEN_DAYS = 7
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------------
# Helpers - password & JWT
# ------------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none",
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none",
                        max_age=REFRESH_TOKEN_DAYS * 86400, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


SUPPORTED_LANGS = ["en", "it", "es", "de", "el", "fr", "pt"]

# 8 thematic preferences (replaces the previous 5 interest tags).
INTEREST_TAGS = [
    "local_legends", "curios", "art", "history",
    "architecture", "sceneries", "food", "shopping",
]

RELATIONSHIP_MODES = ["anonymous", "personal"]
STATUS_OPTIONS    = ["citizen", "visitor", "guest", "tourist", "other"]
GENDER_OPTIONS    = ["male", "female", "non_binary", "prefer_not_to_say"]
PROFESSION_OPTIONS = [
    "student", "researcher", "employee", "manual_craft",
    "self_employed_professional", "retired", "other",
]
COMPANION_OPTIONS = [
    "alone", "with_partner", "with_family",
    "with_friends_or_group", "with_guide",
]
ACCESSIBILITY_OPTIONS = [
    "walking_freely", "limited_stamina", "wheelchair",
    "stroller", "with_assistant", "prefer_not_to_say",
]
RESPONSE_FORMATS  = ["writing", "voice", "image", "dialogue"]
CONTRIBUTION_OPTIONS = ["identify", "illustrate", "narrate", "create_poi"]

# Distance zones (in meters) for the "city talks" experience
SENSED_RADIUS_M = 200   # outermost: tease only
CALLED_RADIUS_M = 80    # mid: name + opening line revealed
FOUND_RADIUS_M  = 25    # inner: full reveal + visit recorded


def _validate_subset(values, allowed, label):
    """Raise 400 if any of `values` is not in `allowed`."""
    if values is None:
        return
    invalid = [v for v in values if v not in allowed]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown {label}: {invalid}")


def _validate_value(value, allowed, label):
    if value is None or value == "":
        return
    if value not in allowed:
        raise HTTPException(status_code=400, detail=f"Unknown {label}: {value}")


# ------------------------------------------------------------------------------------
# Models
# ------------------------------------------------------------------------------------
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: Literal["user", "admin", "contributor"] = "user"
    favorites: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    language: str = "en"
    onboarded: bool = False
    notifications_enabled: bool = False
    # Onboarding questionnaire — all optional / blank by design.
    relationship_mode: Optional[str] = "anonymous"
    status: Optional[str] = None
    gender: Optional[str] = None
    profession: Optional[str] = None
    profession_other: Optional[str] = None  # free-text when profession == "other"
    companions: List[str] = Field(default_factory=list)
    accessibility: List[str] = Field(default_factory=list)
    response_formats: List[str] = Field(default_factory=lambda: ["writing"])
    contribution_interests: List[str] = Field(default_factory=list)

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)
    as_contributor: bool = False

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)

class ProfileIn(BaseModel):
    interests: Optional[List[str]] = None
    language: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    onboarded: Optional[bool] = None
    relationship_mode: Optional[str] = None
    status: Optional[str] = None
    gender: Optional[str] = None
    profession: Optional[str] = None
    profession_other: Optional[str] = None
    companions: Optional[List[str]] = None
    accessibility: Optional[List[str]] = None
    response_formats: Optional[List[str]] = None
    contribution_interests: Optional[List[str]] = None

class POIIn(BaseModel):
    name: str
    short_description: str
    long_description: str
    latitude: float
    longitude: float
    address: str
    category: str
    image_url: str
    trigger_radius_m: int = 60
    hours: Optional[str] = None
    fun_fact: Optional[str] = None
    interest_tags: List[str] = Field(default_factory=list)
    # opening_line is a {language_code: text} map. Falls back to "en".
    opening_line: dict = Field(default_factory=dict)
    # Curator-verified authoritative facts. Take precedence over crowd memory
    # in the AI dialogue system prompt. Each entry is one short sentence.
    canonical_facts: List[str] = Field(default_factory=list)

class POI(POIIn):
    id: str

class VisitIn(BaseModel):
    poi_id: str

class DiscoverIn(BaseModel):
    poi_id: str
    zone: Literal["sensed", "called", "found"]


CONTRIBUTION_TYPES = ["narrative", "dialogue_prompt", "fun_fact", "photo_url"]
CONTRIBUTION_STATUSES = ["pending", "approved", "rejected", "auto_blocked"]


class ContributionIn(BaseModel):
    poi_id: str
    type: Literal["narrative", "dialogue_prompt", "fun_fact", "photo_url"]
    content: str = Field(min_length=2, max_length=4000)
    title: Optional[str] = Field(default=None, max_length=120)


class ContributionModerateIn(BaseModel):
    status: Literal["approved", "rejected"]
    note: Optional[str] = None


# ── Itineraries (gifts) ──────────────────────────────────────────────────
ITINERARY_MIN_POIS = 3
ITINERARY_MAX_POIS = 8
ITINERARY_MAX_DEDICATION = 1200


class ItineraryIn(BaseModel):
    sender_name: str = Field(min_length=1, max_length=80)
    recipient_name: str = Field(min_length=1, max_length=80)
    dedication: str = Field(min_length=1, max_length=ITINERARY_MAX_DEDICATION)
    poi_ids: List[str] = Field(min_length=ITINERARY_MIN_POIS, max_length=ITINERARY_MAX_POIS)
    language: Optional[str] = None  # 'it' | 'en' — defaults to sender language


# ------------------------------------------------------------------------------------
# Auth dependency
# ------------------------------------------------------------------------------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ------------------------------------------------------------------------------------
# Brute-force helpers
# ------------------------------------------------------------------------------------
async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if not rec:
        return
    if rec.get("count", 0) >= LOCKOUT_THRESHOLD:
        last = rec.get("last_attempt")
        if isinstance(last, str):
            last = datetime.fromisoformat(last)
        if last and (datetime.now(timezone.utc) - last) < timedelta(minutes=LOCKOUT_MINUTES):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        await db.login_attempts.delete_one({"identifier": identifier})

async def record_failed_login(identifier: str):
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

async def clear_login_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ------------------------------------------------------------------------------------
# Auth endpoints
# ------------------------------------------------------------------------------------
def _user_to_public(u: dict) -> dict:
    return {
        "id": u["id"], "email": u["email"], "name": u["name"],
        "role": u.get("role", "user"),
        "favorites": u.get("favorites", []),
        "interests": u.get("interests", []),
        "language": u.get("language", "en"),
        "onboarded": u.get("onboarded", False),
        "notifications_enabled": u.get("notifications_enabled", False),
        "relationship_mode": u.get("relationship_mode", "anonymous"),
        "status": u.get("status"),
        "gender": u.get("gender"),
        "profession": u.get("profession"),
        "profession_other": u.get("profession_other"),
        "companions": u.get("companions", []),
        "accessibility": u.get("accessibility", []),
        "response_formats": u.get("response_formats", ["writing"]),
        "contribution_interests": u.get("contribution_interests", []),
    }

@api_router.post("/auth/register", response_model=UserPublic)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    role = "contributor" if payload.as_contributor else "user"
    doc = {
        "id": user_id, "email": email, "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": role, "favorites": [],
        "interests": [], "language": "it", "onboarded": False,
        "notifications_enabled": False,
        "relationship_mode": "anonymous",
        "status": None, "gender": None,
        "profession": None, "profession_other": None,
        "companions": [], "accessibility": [],
        "response_formats": ["writing"],
        "contribution_interests": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    set_auth_cookies(response, create_access_token(user_id, email), create_refresh_token(user_id))
    return _user_to_public(doc)

@api_router.post("/auth/login", response_model=UserPublic)
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    # Use email-only identifier for brute-force lockout. Behind k8s/load-balancer
    # ingresses, request.client.host points at a rotating proxy IP, which would
    # split the per-(ip:email) counter and let attackers bypass the threshold.
    identifier = f"email:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await clear_login_attempts(identifier)
    set_auth_cookies(response, create_access_token(user["id"], email), create_refresh_token(user["id"]))
    return _user_to_public(user)

@api_router.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return _user_to_public(user)

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = create_access_token(user["id"], user["email"])
    response.set_cookie("access_token", new_access, httponly=True, secure=True, samesite="none",
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    return {"ok": True}

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    # Always return ok to avoid user enumeration
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"], "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "created_at": datetime.now(timezone.utc),
        })
        frontend_url = (os.environ.get("FRONTEND_URL") or "").rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={token}"
        logger.info(f"[PASSWORD RESET LINK] {reset_url}")
        lang = user.get("language") or "it"
        subject, html = password_reset_email(reset_url, lang)
        await send_email(user["email"], subject, html)
    return {"ok": True}

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires_at = rec["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    # MongoDB strips tzinfo — add UTC back so comparison works.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


# ------------------------------------------------------------------------------------
# POI endpoints
# ------------------------------------------------------------------------------------
@api_router.get("/pois", response_model=List[POI])
async def list_pois():
    pois = await db.pois.find({}, {"_id": 0}).to_list(500)
    return pois

@api_router.get("/pois/{poi_id}", response_model=POI)
async def get_poi(poi_id: str):
    poi = await db.pois.find_one({"id": poi_id}, {"_id": 0})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    return poi

@api_router.post("/pois", response_model=POI)
async def create_poi(payload: POIIn, _: dict = Depends(require_admin)):
    poi = {"id": str(uuid.uuid4()), **payload.model_dump()}
    await db.pois.insert_one({**poi, "created_at": datetime.now(timezone.utc).isoformat()})
    return poi

@api_router.put("/pois/{poi_id}", response_model=POI)
async def update_poi(poi_id: str, payload: POIIn, _: dict = Depends(require_admin)):
    res = await db.pois.update_one({"id": poi_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="POI not found")
    poi = await db.pois.find_one({"id": poi_id}, {"_id": 0})
    return poi

@api_router.delete("/pois/{poi_id}")
async def delete_poi(poi_id: str, _: dict = Depends(require_admin)):
    res = await db.pois.delete_one({"id": poi_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="POI not found")
    return {"ok": True}

@api_router.post("/pois/reset")
async def reset_pois(_: dict = Depends(require_admin)):
    """Wipe all POIs so a student/curator can fill the database from scratch."""
    res = await db.pois.delete_many({})
    return {"ok": True, "deleted": res.deleted_count}

@api_router.post("/pois/seed")
async def reseed_pois(_: dict = Depends(require_admin)):
    """Re-seed default POIs from area.config.json (only inserts if collection is empty)."""
    inserted = await seed_pois_if_empty()
    return {"ok": True, "inserted": inserted}


# ------------------------------------------------------------------------------------
# User favorites & visits
# ------------------------------------------------------------------------------------
@api_router.post("/me/favorites/{poi_id}")
async def add_favorite(poi_id: str, user: dict = Depends(get_current_user)):
    poi = await db.pois.find_one({"id": poi_id})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"favorites": poi_id}})
    return {"ok": True}

@api_router.delete("/me/favorites/{poi_id}")
async def remove_favorite(poi_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"favorites": poi_id}})
    return {"ok": True}

@api_router.get("/me/favorites", response_model=List[POI])
async def get_favorites(user: dict = Depends(get_current_user)):
    fav_ids = user.get("favorites", [])
    if not fav_ids:
        return []
    pois = await db.pois.find({"id": {"$in": fav_ids}}, {"_id": 0}).to_list(500)
    return pois

@api_router.post("/me/visits")
async def record_visit(payload: VisitIn, user: dict = Depends(get_current_user)):
    poi = await db.pois.find_one({"id": payload.poi_id})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    # Avoid duplicate visit within the last 6 hours
    six_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    existing = await db.visits.find_one({
        "user_id": user["id"], "poi_id": payload.poi_id,
        "visited_at": {"$gt": six_hours_ago},
    })
    if existing:
        return {"ok": True, "duplicate": True}
    await db.visits.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "poi_id": payload.poi_id,
        "visited_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}

@api_router.get("/me/visits")
async def list_visits(user: dict = Depends(get_current_user)):
    visits = await db.visits.find({"user_id": user["id"]}, {"_id": 0}).sort("visited_at", -1).to_list(500)
    poi_ids = list({v["poi_id"] for v in visits})
    pois = {p["id"]: p for p in await db.pois.find({"id": {"$in": poi_ids}}, {"_id": 0}).to_list(500)}
    return [{"id": v["id"], "visited_at": v["visited_at"], "poi": pois.get(v["poi_id"])} for v in visits]


# ------------------------------------------------------------------------------------
# Profile + Discoveries (the "city talks" experience)
# ------------------------------------------------------------------------------------
def _apply_list_fields(payload: "ProfileIn", update: dict):
    """Validate + stage the list-of-tags fields onto `update`."""
    pairs = [
        ("interests",              payload.interests,              INTEREST_TAGS),
        ("companions",             payload.companions,             COMPANION_OPTIONS),
        ("accessibility",          payload.accessibility,          ACCESSIBILITY_OPTIONS),
        ("response_formats",       payload.response_formats,       RESPONSE_FORMATS),
        ("contribution_interests", payload.contribution_interests, CONTRIBUTION_OPTIONS),
    ]
    for field, values, allowed in pairs:
        if values is not None:
            _validate_subset(values, allowed, field)
            update[field] = values


def _apply_enum_fields(payload: "ProfileIn", update: dict):
    """Validate + stage the single-value enum fields onto `update`."""
    if payload.language is not None:
        if payload.language not in SUPPORTED_LANGS:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}")
        update["language"] = payload.language
    pairs = [
        ("relationship_mode", payload.relationship_mode, RELATIONSHIP_MODES),
        ("status",            payload.status,            STATUS_OPTIONS),
        ("gender",            payload.gender,            GENDER_OPTIONS),
        ("profession",        payload.profession,        PROFESSION_OPTIONS),
    ]
    for field, value, allowed in pairs:
        if value is not None:
            _validate_value(value, allowed, field)
            update[field] = value or None
    if payload.profession_other is not None:
        update["profession_other"] = (payload.profession_other or "").strip() or None


def _apply_bool_fields(payload: "ProfileIn", update: dict):
    if payload.notifications_enabled is not None:
        update["notifications_enabled"] = bool(payload.notifications_enabled)
    if payload.onboarded is not None:
        update["onboarded"] = bool(payload.onboarded)


@api_router.patch("/me/profile", response_model=UserPublic)
async def update_profile(payload: ProfileIn, user: dict = Depends(get_current_user)):
    update: dict = {}
    _apply_list_fields(payload, update)
    _apply_enum_fields(payload, update)
    _apply_bool_fields(payload, update)
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return _user_to_public(fresh)


@api_router.post("/me/discoveries")
async def record_discovery(payload: DiscoverIn, user: dict = Depends(get_current_user)):
    """Persist that a POI has been sensed/called/found by the user.
    The doc keeps the highest zone reached so far (sensed < called < found)."""
    poi = await db.pois.find_one({"id": payload.poi_id})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    zone_rank = {"sensed": 1, "called": 2, "found": 3}
    existing = await db.discoveries.find_one({"user_id": user["id"], "poi_id": payload.poi_id})
    now_iso = datetime.now(timezone.utc).isoformat()
    if existing:
        if zone_rank[payload.zone] > zone_rank[existing.get("zone", "sensed")]:
            await db.discoveries.update_one(
                {"_id": existing["_id"]},
                {"$set": {"zone": payload.zone, "updated_at": now_iso}},
            )
            return {"ok": True, "upgraded": True, "zone": payload.zone}
        return {"ok": True, "upgraded": False, "zone": existing.get("zone", "sensed")}
    await db.discoveries.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "poi_id": payload.poi_id,
        "zone": payload.zone,
        "discovered_at": now_iso,
        "updated_at": now_iso,
    })
    return {"ok": True, "upgraded": False, "zone": payload.zone}


@api_router.get("/me/discoveries")
async def list_discoveries(user: dict = Depends(get_current_user)):
    docs = await db.discoveries.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("discovered_at", -1).to_list(500)
    poi_ids = [d["poi_id"] for d in docs]
    pois = {p["id"]: p for p in await db.pois.find({"id": {"$in": poi_ids}}, {"_id": 0}).to_list(500)}
    return [{
        "id": d["id"], "zone": d["zone"],
        "discovered_at": d["discovered_at"], "updated_at": d.get("updated_at"),
        "poi": pois.get(d["poi_id"]),
    } for d in docs if pois.get(d["poi_id"]) is not None]


@api_router.get("/config")
async def get_config():
    """Public app configuration so the frontend doesn't hardcode constants."""
    return {
        "supported_languages": SUPPORTED_LANGS,
        "interest_tags": INTEREST_TAGS,
        "relationship_modes": RELATIONSHIP_MODES,
        "status_options": STATUS_OPTIONS,
        "gender_options": GENDER_OPTIONS,
        "profession_options": PROFESSION_OPTIONS,
        "companion_options": COMPANION_OPTIONS,
        "accessibility_options": ACCESSIBILITY_OPTIONS,
        "response_formats": RESPONSE_FORMATS,
        "contribution_options": CONTRIBUTION_OPTIONS,
        "contribution_types": CONTRIBUTION_TYPES,
        "zones": {
            "sensed_radius_m": SENSED_RADIUS_M,
            "called_radius_m": CALLED_RADIUS_M,
            "found_radius_m": FOUND_RADIUS_M,
        },
    }


@api_router.get("/area")
async def get_area():
    """Public area (city/campus) configuration: brand, palette, map center,
    and the 5 landing-page landmarks. Admin overrides (if any) are layered
    on top of the JSON file so changes made via /admin/area show up live."""
    overrides = await _active_area_overrides()
    return area_merged_payload(overrides)


# ── Admin: edit the active area overrides (Option B — Polished Template) ─
class AreaPatchIn(BaseModel):
    """Any subset of the area config. Omitted keys pass through from JSON."""
    slug: Optional[str] = None
    brand: Optional[dict] = None
    area: Optional[dict] = None
    city: Optional[dict] = None
    tagline: Optional[dict] = None
    map: Optional[dict] = None
    palette: Optional[dict] = None
    landmarks: Optional[List[dict]] = None


@api_router.get("/admin/area-settings")
async def admin_get_area_settings(_: dict = Depends(require_admin)):
    """Return raw overrides + the effective merged config, so the admin UI
    can distinguish defaults from customised values."""
    overrides = await _active_area_overrides()
    return {"overrides": overrides, "effective": area_merged_payload(overrides)}


@api_router.patch("/admin/area-settings")
async def admin_patch_area_settings(
    payload: AreaPatchIn,
    _: dict = Depends(require_admin),
):
    """Shallow-merge the payload into the active overrides document. Pass
    null/empty to clear an override and fall back to the JSON default."""
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        # No changes — just return the current state
        overrides = await _active_area_overrides()
        return {"overrides": overrides, "effective": area_merged_payload(overrides)}
    await db.area_settings.update_one(
        {"_id": "active"},
        {"$set": {**update, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    overrides = await _active_area_overrides()
    return {"overrides": overrides, "effective": area_merged_payload(overrides)}


@api_router.delete("/admin/area-settings")
async def admin_reset_area_settings(_: dict = Depends(require_admin)):
    """Wipe every override and fall back entirely to the JSON file."""
    await db.area_settings.delete_many({})
    return {"ok": True, "effective": area_merged_payload({})}


@api_router.get("/admin/area-export")
async def admin_export_area(_: dict = Depends(require_admin)):
    """Download the CURRENT effective config (JSON + overrides, deep merged)
    as a standalone file — paste into /app/area.config.json on any deploy
    to reproduce this city exactly."""
    overrides = await _active_area_overrides()
    effective = area_merged_payload(overrides)
    # Effective payload omits the heavy POI seed; layer it back so the file
    # is a complete, drop-in replacement for /app/area.config.json.
    cfg = load_area_config()
    out = {**effective, "pois": cfg.get("pois", [])}
    filename = f"area-{(out.get('slug') or 'export').replace('/', '-')}.json"
    return FastAPIResponse(
        content=json.dumps(out, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"content-disposition": f'attachment; filename="{filename}"'},
    )


@api_router.post("/admin/area-import")
async def admin_import_area(
    payload: dict,
    _: dict = Depends(require_admin),
):
    """Replace the overrides with the provided JSON. Accepts a full area
    config; stores everything except `pois` in overrides (POIs remain
    managed via the /pois CRUD + reset endpoints)."""
    allowed = {"slug", "brand", "area", "city", "tagline", "map", "palette", "landmarks"}
    update = {k: v for k, v in payload.items() if k in allowed and v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Import payload has no recognised keys.")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Replace (not merge) so stale fields are cleared
    await db.area_settings.replace_one({"_id": "active"}, {"_id": "active", **update}, upsert=True)
    overrides = await _active_area_overrides()
    return {"ok": True, "effective": area_merged_payload(overrides)}


# ------------------------------------------------------------------------------------
# Contributions (student-curated narratives, dialogue prompts, fun-facts, photos)
# ------------------------------------------------------------------------------------
def _serialize_contribution(c: dict) -> dict:
    return {
        "id": c["id"],
        "poi_id": c["poi_id"],
        "user_id": c["user_id"],
        "user_name": c.get("user_name", ""),
        "type": c["type"],
        "title": c.get("title"),
        "content": c["content"],
        "status": c.get("status", "pending"),
        "moderation_note": c.get("moderation_note"),
        "created_at": c.get("created_at"),
        "updated_at": c.get("updated_at"),
    }


def _is_contributor_or_admin(user: dict) -> bool:
    return user.get("role") in ("contributor", "admin")


@api_router.post("/contributions")
async def create_contribution(payload: ContributionIn, user: dict = Depends(get_current_user)):
    if not _is_contributor_or_admin(user):
        raise HTTPException(status_code=403, detail="Contributor role required. Sign up as a contributor or ask an admin to upgrade your account.")
    poi = await db.pois.find_one({"id": payload.poi_id})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    now_iso = datetime.now(timezone.utc).isoformat()

    # ── Pre-moderation safety screen ──────────────────────────────────────
    # Admin contributions skip the screen entirely (they're trusted).
    # Photo URLs skip the LLM — we only check text payloads.
    initial_status = "approved" if user.get("role") == "admin" else "pending"
    safety_reason = None
    if user.get("role") != "admin" and payload.type != "photo_url":
        verdict = await screen_contribution(
            kind=payload.type, title=payload.title, content=payload.content,
            lang=user.get("language") or "it",
        )
        if verdict.get("verdict") == VERDICT_BLOCK:
            initial_status = "auto_blocked"
            safety_reason = verdict.get("reason")

    doc = {
        "id": str(uuid.uuid4()),
        "poi_id": payload.poi_id,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "type": payload.type,
        "title": (payload.title or "").strip() or None,
        "content": payload.content.strip(),
        "status": initial_status,
        "moderation_note": safety_reason,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.contributions.insert_one(doc)
    return _serialize_contribution(doc)


@api_router.get("/contributions/mine")
async def list_my_contributions(user: dict = Depends(get_current_user)):
    docs = await db.contributions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    poi_ids = list({d["poi_id"] for d in docs})
    pois = {p["id"]: p for p in await db.pois.find({"id": {"$in": poi_ids}}, {"_id": 0}).to_list(500)}
    return [{**_serialize_contribution(d), "poi": pois.get(d["poi_id"])} for d in docs]


@api_router.get("/contributions")
async def list_all_contributions(
    status: Optional[str] = None,
    _: dict = Depends(require_admin),
):
    query: dict = {}
    if status:
        if status not in CONTRIBUTION_STATUSES:
            raise HTTPException(status_code=400, detail=f"Unknown status: {status}")
        query["status"] = status
    docs = await db.contributions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    poi_ids = list({d["poi_id"] for d in docs})
    pois = {p["id"]: p for p in await db.pois.find({"id": {"$in": poi_ids}}, {"_id": 0}).to_list(500)}
    return [{**_serialize_contribution(d), "poi": pois.get(d["poi_id"])} for d in docs]


@api_router.patch("/contributions/{contribution_id}/moderate")
async def moderate_contribution(
    contribution_id: str,
    payload: ContributionModerateIn,
    _: dict = Depends(require_admin),
):
    rec = await db.contributions.find_one({"id": contribution_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Contribution not found")
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.contributions.update_one(
        {"id": contribution_id},
        {"$set": {
            "status": payload.status,
            "moderation_note": (payload.note or "").strip() or None,
            "updated_at": now_iso,
        }},
    )
    fresh = await db.contributions.find_one({"id": contribution_id}, {"_id": 0})
    # Best-effort email notification to the contributor. Must not fail the
    # request if the user was deleted or email can't be sent.
    try:
        contributor = await db.users.find_one({"id": fresh["user_id"]}, {"_id": 0})
        poi = await db.pois.find_one({"id": fresh["poi_id"]}, {"_id": 0})
        if contributor and poi:
            lang = contributor.get("language") or "it"
            subject, html = contribution_moderated_email(
                contributor.get("name", ""), fresh["status"], poi.get("name", ""),
                fresh.get("moderation_note"), lang,
            )
            await send_email(contributor["email"], subject, html)
    except Exception as err:
        logger.warning("Moderation email skipped: %s", err)
    return _serialize_contribution(fresh)


@api_router.delete("/contributions/{contribution_id}")
async def delete_contribution(contribution_id: str, user: dict = Depends(get_current_user)):
    rec = await db.contributions.find_one({"id": contribution_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Contribution not found")
    is_owner_pending = rec["user_id"] == user["id"] and rec.get("status") == "pending"
    if user.get("role") != "admin" and not is_owner_pending:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.contributions.delete_one({"id": contribution_id})
    return {"ok": True}


@api_router.get("/pois/{poi_id}/contributions")
async def list_poi_contributions(poi_id: str):
    """Public: only approved contributions are exposed."""
    poi = await db.pois.find_one({"id": poi_id})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    docs = await db.contributions.find(
        {"poi_id": poi_id, "status": "approved"}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return [_serialize_contribution(d) for d in docs]


# ------------------------------------------------------------------------------------
# POI-as-character chat (Claude Sonnet 4.5)
# ------------------------------------------------------------------------------------
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    language: Optional[str] = None  # falls back to authed user language or "it"


@api_router.post("/pois/{poi_id}/chat")
async def chat_with_poi(
    poi_id: str,
    payload: ChatIn,
    request: Request,
):
    poi = await db.pois.find_one({"id": poi_id}, {"_id": 0})
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")

    # Approved contributions enrich the system prompt — student voices
    # literally shape what the place says next.
    contribs = await db.contributions.find(
        {"poi_id": poi_id, "status": "approved"}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # User context (optional — anonymous visitors are welcome to chat)
    current_user = None
    try:
        token = request.cookies.get("access_token")
        if token:
            data = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            current_user = await db.users.find_one({"id": data.get("sub")}, {"_id": 0})
    except Exception:
        current_user = None

    lang = (payload.language or (current_user or {}).get("language") or "it").lower()
    if lang not in SUPPORTED_LANGS:
        lang = "it"

    history = [t.dict() for t in payload.history]
    text = await poi_chat_reply(
        poi=poi, contribs=contribs, user=current_user,
        history=history, message=payload.message, lang=lang,
    )
    return {"reply": text, "lang": lang}


# ------------------------------------------------------------------------------------
# Landmark chat (well-known anchors on the landing page — open to anonymous visitors).
# Landmarks are loaded from the area config so the same code serves any city.
# ------------------------------------------------------------------------------------
async def _active_area_overrides() -> dict:
    """Load the single `active` document from the area_settings collection.
    Returns {} if no admin overrides have been saved yet."""
    doc = await db.area_settings.find_one({"_id": "active"}) or {}
    # Mongo injects _id; drop it before use
    doc.pop("_id", None)
    return doc


def _landmark_by_id(landmark_id: str) -> Optional[dict]:
    return area_landmarks_dict().get(landmark_id)


async def _landmark_by_id_live(landmark_id: str) -> Optional[dict]:
    """Lookup honouring admin overrides (used by /api/landmarks/{id}/chat)."""
    overrides = await _active_area_overrides()
    return area_merged_landmarks(overrides).get(landmark_id)


@api_router.post("/landmarks/{landmark_id}/chat")
async def chat_with_landmark(
    landmark_id: str,
    payload: ChatIn,
    request: Request,
):
    landmark = await _landmark_by_id_live(landmark_id)
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")

    # Optional auth context
    current_user = None
    try:
        token = request.cookies.get("access_token")
        if token:
            data = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            current_user = await db.users.find_one({"id": data.get("sub")}, {"_id": 0})
    except Exception:
        current_user = None

    lang = (payload.language or (current_user or {}).get("language") or "it").lower()
    if lang not in SUPPORTED_LANGS:
        lang = "it"

    history = [t.dict() for t in payload.history]
    text = await poi_chat_reply(
        poi=landmark, contribs=[], user=current_user,
        history=history, message=payload.message, lang=lang,
    )
    return {"reply": text, "lang": lang}



# ------------------------------------------------------------------------------------
# Itineraries — gift a curated 3-8 POI walk to someone
# ------------------------------------------------------------------------------------
def _serialize_itinerary(it: dict, pois_by_id: Optional[dict] = None) -> dict:
    out = {
        "id": it["id"],
        "slug": it["slug"],
        "sender_name": it.get("sender_name", ""),
        "sender_user_id": it.get("sender_user_id"),
        "recipient_name": it.get("recipient_name", ""),
        "dedication": it.get("dedication", ""),
        "poi_ids": it.get("poi_ids", []),
        "language": it.get("language", "it"),
        "view_count": int(it.get("view_count", 0) or 0),
        "created_at": it.get("created_at"),
    }
    if pois_by_id is not None:
        # Surface the full POI objects in the public response so the recipient
        # page can render the walk without a second round-trip.
        out["pois"] = [pois_by_id[pid] for pid in out["poi_ids"] if pid in pois_by_id]
    return out


@api_router.post("/itineraries")
async def create_itinerary(payload: ItineraryIn, user: dict = Depends(get_current_user)):
    # De-duplicate poi_ids while keeping order, then validate they all exist.
    seen, ordered = set(), []
    for pid in payload.poi_ids:
        if pid not in seen:
            seen.add(pid)
            ordered.append(pid)
    if len(ordered) < ITINERARY_MIN_POIS:
        raise HTTPException(status_code=400, detail=f"At least {ITINERARY_MIN_POIS} unique POIs required.")
    found_count = await db.pois.count_documents({"id": {"$in": ordered}})
    if found_count != len(ordered):
        raise HTTPException(status_code=400, detail="One or more POIs no longer exist.")

    lang = (payload.language or user.get("language") or "it").lower()
    if lang not in SUPPORTED_LANGS:
        lang = "it"

    # Generate a short URL-safe slug; loop a few times if the rare collision happens.
    slug = None
    for _ in range(6):
        candidate = secrets.token_urlsafe(6).rstrip("_-")[:8]
        if not await db.itineraries.find_one({"slug": candidate}):
            slug = candidate
            break
    if slug is None:
        # Extremely unlikely with ~1e14 keyspace; fall back to a UUID prefix.
        slug = uuid.uuid4().hex[:10]

    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "sender_user_id": user["id"],
        "sender_name": payload.sender_name.strip(),
        "recipient_name": payload.recipient_name.strip(),
        "dedication": payload.dedication.strip(),
        "poi_ids": ordered,
        "language": lang,
        "view_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.itineraries.insert_one(doc)
    return _serialize_itinerary(doc)


@api_router.get("/itineraries/{slug}")
async def get_itinerary(slug: str):
    """Public. Increments view_count (best-effort) so the sender knows it was opened."""
    it = await db.itineraries.find_one({"slug": slug}, {"_id": 0})
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    pois = await db.pois.find({"id": {"$in": it.get("poi_ids", [])}}, {"_id": 0}).to_list(50)
    pois_by_id = {p["id"]: p for p in pois}
    # Best-effort view counter — never block the response.
    try:
        await db.itineraries.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    except Exception as err:
        logger.warning("itinerary view_count bump failed: %s", err)
    return _serialize_itinerary(it, pois_by_id)


@api_router.get("/me/itineraries")
async def list_my_itineraries(user: dict = Depends(get_current_user)):
    docs = await db.itineraries.find(
        {"sender_user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [_serialize_itinerary(d) for d in docs]


@api_router.delete("/itineraries/{itinerary_id}")
async def delete_itinerary(itinerary_id: str, user: dict = Depends(get_current_user)):
    rec = await db.itineraries.find_one({"id": itinerary_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    if rec.get("sender_user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.itineraries.delete_one({"id": itinerary_id})
    return {"ok": True}


# ── Sharing: OG-tagged HTML + per-gift PNG preview ───────────────────────
def _backend_origin(request: Request) -> str:
    """Best-effort URL for asset references inside the share HTML.
    Honours the X-Forwarded-* headers added by the k8s ingress."""
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host}"


@api_router.get("/share/{slug}", response_class=HTMLResponse)
async def share_itinerary(slug: str, request: Request):
    """Public unfurl-friendly HTML: OG/Twitter meta tags + meta-refresh
    redirect to the SPA's /gift/{slug} route. This is the URL recipients
    actually share — bots see the preview, browsers get the real page."""
    it = await db.itineraries.find_one({"slug": slug}, {"_id": 0})
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    frontend = (os.environ.get("FRONTEND_URL") or _backend_origin(request)).rstrip("/")
    og_image = f"{_backend_origin(request)}/api/og-image/itineraries/{slug}.png"
    html = render_share_html(it, frontend_url=frontend, og_image_url=og_image)
    # Cache for 1 hour at the edge — gift content doesn't change after creation.
    return HTMLResponse(content=html, headers={"cache-control": "public, max-age=3600"})


@api_router.get("/og-image/itineraries/{slug}.png")
async def og_image_itinerary(slug: str):
    """Per-gift 1200×630 PNG composed at request time."""
    it = await db.itineraries.find_one({"slug": slug}, {"_id": 0})
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    png = render_og_image(
        sender=it.get("sender_name", "") or "",
        recipient=it.get("recipient_name", "") or "",
        poi_count=len(it.get("poi_ids", []) or []),
        lang=(it.get("language") or "it").lower(),
    )
    return FastAPIResponse(
        content=png,
        media_type="image/png",
        headers={"cache-control": "public, max-age=86400"},
    )



# ------------------------------------------------------------------------------------
# Health
# ------------------------------------------------------------------------------------
@api_router.get("/")
async def root():
    cfg = load_area_config()
    brand = cfg.get("brand", {}).get("en") or "Aura Discover"
    return {"app": brand, "ok": True, "slug": cfg.get("slug")}


# ------------------------------------------------------------------------------------
# Startup: indexes, admin seed, POI seed
# ------------------------------------------------------------------------------------
# POI seeds + landing-page landmarks both live in /app/area.config.json
# so the same codebase can be re-skinned for any city/campus. The
# loader functions below read that config at call-time.


def _enrich_seed(p: dict) -> dict:
    """Shape a config POI dict into the exact form stored in MongoDB."""
    return {
        "name": p["name"],
        "short_description": p.get("short_description", ""),
        "long_description": p.get("long_description", ""),
        "latitude": p["latitude"],
        "longitude": p["longitude"],
        "address": p.get("address", ""),
        "category": p.get("category", ""),
        "image_url": p.get("image_url", ""),
        "trigger_radius_m": int(p.get("trigger_radius_m", 60)),
        "hours": p.get("hours"),
        "fun_fact": p.get("fun_fact"),
        "interest_tags": list(p.get("interest_tags", [])),
        "opening_line": dict(p.get("opening_line", {})),
        "canonical_facts": list(p.get("canonical_facts", [])),
    }


async def seed_pois_if_empty() -> int:
    """Insert default POIs from the area config only if the collection is
    empty. Migrates stale documents (missing opening_line OR using the
    legacy 5-tag taxonomy) by wiping and reseeding."""
    LEGACY_TAGS = {"hidden_gardens", "historic_cafes", "hidden_courtyards",
                   "renaissance_traces", "artisan_workshops"}
    count = await db.pois.count_documents({})
    if count > 0:
        stale = await db.pois.find_one({"opening_line": {"$exists": False}})
        legacy = await db.pois.find_one({"interest_tags": {"$in": list(LEGACY_TAGS)}})
        if stale is None and legacy is None:
            return 0
        logger.info("Detected stale/legacy POIs; reseeding…")
        await db.pois.delete_many({})
    docs = []
    for p in area_pois_seed():
        enriched = _enrich_seed(p)
        docs.append({
            "id": str(uuid.uuid4()),
            **enriched,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    if docs:
        await db.pois.insert_many(docs)
    return len(docs)


async def _upsert_admin(admin_email: str, admin_password: str, display_name: str):
    """Idempotently seed a single admin account. No-op if the email exists."""
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email, "name": display_name,
            "password_hash": hash_password(admin_password),
            "role": "admin", "favorites": [],
            "interests": list(INTEREST_TAGS),
            "language": "it",
            "onboarded": True,
            "notifications_enabled": False,
            "relationship_mode": "personal",
            "status": "citizen", "gender": None,
            "profession": None, "profession_other": None,
            "companions": [], "accessibility": [],
            "response_formats": ["writing"],
            "contribution_interests": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
        return

    # Ensure existing admin has the new profile fields without overwriting custom values.
    defaults = {}
    if "interests" not in existing or any(t not in INTEREST_TAGS for t in existing.get("interests", [])):
        defaults["interests"] = list(INTEREST_TAGS)
    if "language" not in existing:
        defaults["language"] = "en"
    if "onboarded" not in existing:
        defaults["onboarded"] = True
    if "notifications_enabled" not in existing:
        defaults["notifications_enabled"] = False
    if "relationship_mode" not in existing:
        defaults["relationship_mode"] = "personal"
    if "response_formats" not in existing:
        defaults["response_formats"] = ["writing"]
    for f in ("companions", "accessibility", "contribution_interests"):
        if f not in existing:
            defaults[f] = []
    if defaults:
        await db.users.update_one({"email": admin_email}, {"$set": defaults})
    # Rotate the stored password hash if the env-configured password has changed.
    if not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )
        logger.info(f"Updated admin password for: {admin_email}")


async def seed_admin():
    area = load_area_config()
    brand_en = (area.get("brand") or {}).get("en") or "Aura"
    # Primary admin (required)
    await _upsert_admin(
        os.environ.get("ADMIN_EMAIL", "admin@brera.app").lower(),
        os.environ.get("ADMIN_PASSWORD", "admin123"),
        f"{brand_en} Admin",
    )
    # Optional co-admin — lets the lead curator delegate without sharing the
    # main password. Skipped silently if env vars aren't set.
    co_email = (os.environ.get("CO_ADMIN_EMAIL") or "").strip().lower()
    co_password = os.environ.get("CO_ADMIN_PASSWORD") or ""
    if co_email and co_password:
        await _upsert_admin(co_email, co_password, f"{brand_en} Co-Admin")


@app.on_event("startup")
async def on_startup():
    # Fail fast if area.config.json is missing or malformed.
    area_cfg = load_area_config()
    logger.info("Area template: %s", area_cfg.get("slug"))
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.pois.create_index("id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.visits.create_index([("user_id", 1), ("visited_at", -1)])
    await db.discoveries.create_index([("user_id", 1), ("poi_id", 1)], unique=True)
    await db.discoveries.create_index([("user_id", 1), ("discovered_at", -1)])
    await db.contributions.create_index([("poi_id", 1), ("status", 1)])
    await db.contributions.create_index([("user_id", 1), ("created_at", -1)])
    await db.contributions.create_index("id", unique=True)
    await db.itineraries.create_index("slug", unique=True)
    await db.itineraries.create_index([("sender_user_id", 1), ("created_at", -1)])
    await db.itineraries.create_index("id", unique=True)
    await seed_admin()
    inserted = await seed_pois_if_empty()
    logger.info(f"Startup complete. POIs seeded: {inserted}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ------------------------------------------------------------------------------------
# Wire router & CORS
# ------------------------------------------------------------------------------------
app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "")
allowed_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)
if not allowed_origins:
    allowed_origins = ["*"]

# When using credentialed cookies, '*' is invalid — fall back to specific origin
if "*" in allowed_origins and frontend_url:
    allowed_origins = [frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
