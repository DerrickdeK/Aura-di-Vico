from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import secrets
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ------------------------------------------------------------------------------------
# DB & app setup
# ------------------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Brera Discover API")
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

class POI(POIIn):
    id: str

class VisitIn(BaseModel):
    poi_id: str

class DiscoverIn(BaseModel):
    poi_id: str
    zone: Literal["sensed", "called", "found"]


CONTRIBUTION_TYPES = ["narrative", "dialogue_prompt", "fun_fact", "photo_url"]
CONTRIBUTION_STATUSES = ["pending", "approved", "rejected"]


class ContributionIn(BaseModel):
    poi_id: str
    type: Literal["narrative", "dialogue_prompt", "fun_fact", "photo_url"]
    content: str = Field(min_length=2, max_length=4000)
    title: Optional[str] = Field(default=None, max_length=120)


class ContributionModerateIn(BaseModel):
    status: Literal["approved", "rejected"]
    note: Optional[str] = None


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
        logger.info(f"[PASSWORD RESET LINK] /reset-password?token={token}")
    return {"ok": True}

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires_at = rec["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
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
    """Re-seed default Brera POIs (only inserts if collection is empty)."""
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
    doc = {
        "id": str(uuid.uuid4()),
        "poi_id": payload.poi_id,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "type": payload.type,
        "title": (payload.title or "").strip() or None,
        "content": payload.content.strip(),
        "status": "approved" if user.get("role") == "admin" else "pending",
        "moderation_note": None,
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
# Health
# ------------------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"app": "Brera Discover", "ok": True}


# ------------------------------------------------------------------------------------
# Startup: indexes, admin seed, POI seed
# ------------------------------------------------------------------------------------
BRERA_POI_SEED = [
    {
        "name": "Orto Botanico di Brera",
        "short_description": "A secret 18th-century botanical garden tucked behind Palazzo Brera.",
        "long_description": "Founded in 1774 by Maria Theresa of Austria, this hidden 5,000 sqm garden hosts ancient ginkgo trees, medicinal plants and a quiet pond. Few tourists know it exists.",
        "latitude": 45.4719, "longitude": 9.1881,
        "address": "Via Brera 28, 20121 Milano",
        "category": "Hidden Garden",
        "image_url": "https://images.unsplash.com/photo-1512204925985-f52390a87fda?w=1200",
        "trigger_radius_m": 70,
        "hours": "Mon–Fri 10:00–18:00",
        "fun_fact": "Two of its ginkgo biloba trees are over 240 years old.",
    },
    {
        "name": "Cortile della Pinacoteca",
        "short_description": "The arcaded courtyard with Napoleon as a Roman god.",
        "long_description": "Inside Palazzo Brera, this neoclassical courtyard hosts a striking bronze nude of Napoleon by Antonio Canova. Free to enter even without a museum ticket.",
        "latitude": 45.4720, "longitude": 9.1879,
        "address": "Via Brera 28, 20121 Milano",
        "category": "Courtyard",
        "image_url": "https://images.pexels.com/photos/17355546/pexels-photo-17355546.jpeg?w=1200",
        "trigger_radius_m": 50,
        "hours": "Daily 09:00–19:00",
        "fun_fact": "Canova depicted Napoleon idealised, twice life-size, holding a Nike.",
    },
    {
        "name": "Fioraio Bianchi Caffè",
        "short_description": "A Parisian-style florist that became a tiny bistrot.",
        "long_description": "Half flower shop, half restaurant — Raimondo Bianchi's 1976 atelier still arranges blooms among marble tables and serves a beloved seasonal lunch.",
        "latitude": 45.4742, "longitude": 9.1907,
        "address": "Via Montebello 7, 20121 Milano",
        "category": "Café & Workshop",
        "image_url": "https://images.pexels.com/photos/18425415/pexels-photo-18425415.jpeg?w=1200",
        "trigger_radius_m": 40,
        "hours": "Tue–Sat 12:00–23:00",
        "fun_fact": "Many Milanese still order their wedding bouquets here.",
    },
    {
        "name": "Cimitero di San Marco (vestiges)",
        "short_description": "Traces of a medieval graveyard hidden beneath the church square.",
        "long_description": "The piazza in front of San Marco church covers the former parish cemetery. Look for worn tombstones reused as paving stones near the side wall.",
        "latitude": 45.4754, "longitude": 9.1892,
        "address": "Piazza San Marco, 20121 Milano",
        "category": "Historic Trace",
        "image_url": "https://images.unsplash.com/photo-1615800098746-73af8261e3df?w=1200",
        "trigger_radius_m": 55,
        "hours": "Always accessible",
        "fun_fact": "Mozart performed inside San Marco at age 14, in 1770.",
    },
    {
        "name": "Casa degli Atellani — Vigna di Leonardo",
        "short_description": "Leonardo da Vinci's personal vineyard, replanted on the original soil.",
        "long_description": "Just a few minutes from Brera, this Renaissance house preserves the vineyard gifted to Leonardo by Ludovico il Moro in 1498. The malvasia vines were genetically restored in 2015.",
        "latitude": 45.4661, "longitude": 9.1715,
        "address": "Corso Magenta 65, 20123 Milano",
        "category": "Renaissance Garden",
        "image_url": "https://images.unsplash.com/photo-1636742943367-d79c45199670?w=1200",
        "trigger_radius_m": 70,
        "hours": "Daily 09:00–18:00 (ticketed)",
        "fun_fact": "Leonardo mentioned the vineyard in his will of 1519.",
    },
    {
        "name": "Libreria Bocca",
        "short_description": "Italy's oldest bookshop, founded 1775.",
        "long_description": "Hidden in Galleria Vittorio Emanuele but spiritually a Brera neighbour, Bocca has specialised in art, fine prints, and rare editions since the late 18th century.",
        "latitude": 45.4659, "longitude": 9.1900,
        "address": "Galleria Vittorio Emanuele II 12, 20121 Milano",
        "category": "Historic Shop",
        "image_url": "https://images.unsplash.com/photo-1512204925985-f52390a87fda?w=1200",
        "trigger_radius_m": 35,
        "hours": "Mon–Sat 10:00–19:30",
        "fun_fact": "Futurist manifestos by Marinetti were printed and sold here.",
    },
    {
        "name": "Vicolo dei Lavandai",
        "short_description": "The last open-air laundry alley of Milan, on the Naviglio.",
        "long_description": "Just south of Brera along the Naviglio Grande, this narrow lane preserves the 1700s wash-house where lavandai (male washermen) cleaned the city's laundry until the 1950s.",
        "latitude": 45.4527, "longitude": 9.1736,
        "address": "Vicolo dei Lavandai, 20143 Milano",
        "category": "Historic Trace",
        "image_url": "https://images.pexels.com/photos/18425415/pexels-photo-18425415.jpeg?w=1200",
        "trigger_radius_m": 35,
        "hours": "Always accessible",
        "fun_fact": "It was protected as a monument in 1982 to save it from demolition.",
    },
    {
        "name": "Chiesa di San Carpoforo",
        "short_description": "A deconsecrated 11th-century church now hosting Brera Academy exhibitions.",
        "long_description": "One of the oldest churches in Milan, repurposed into an exhibition hall by the nearby Accademia di Belle Arti. Romanesque bones with contemporary art layered on top.",
        "latitude": 45.4730, "longitude": 9.1872,
        "address": "Via Marco Formentini 10, 20121 Milano",
        "category": "Hidden Church",
        "image_url": "https://images.pexels.com/photos/17355546/pexels-photo-17355546.jpeg?w=1200",
        "trigger_radius_m": 40,
        "hours": "Wed–Sun 14:00–19:00 during exhibitions",
        "fun_fact": "Originally founded around 1040 AD.",
    },
    {
        "name": "Bar Jamaica",
        "short_description": "The 1920s artists' bar where Brera bohemia was born.",
        "long_description": "Hemingway, Lucio Fontana, Quasimodo and Ungaretti all drank here. The walls are still hung with original photographs of Brera's mid-century painters and poets.",
        "latitude": 45.4738, "longitude": 9.1874,
        "address": "Via Brera 32, 20121 Milano",
        "category": "Historic Café",
        "image_url": "https://images.unsplash.com/photo-1636742943367-d79c45199670?w=1200",
        "trigger_radius_m": 35,
        "hours": "Daily 07:30–01:30",
        "fun_fact": "It is the unofficial 'living room' of the Accademia di Belle Arti.",
    },
    {
        "name": "Palazzo Cusani",
        "short_description": "An 18th-century palace with two contrasting facades.",
        "long_description": "Designed by Giovanni Ruggeri (1719) on Via Brera and by Piermarini on the back — it is the only Milanese palace whose two main fronts come from rival baroque/neoclassical architects.",
        "latitude": 45.4729, "longitude": 9.1888,
        "address": "Via Brera 15, 20121 Milano",
        "category": "Hidden Palace",
        "image_url": "https://images.pexels.com/photos/17355546/pexels-photo-17355546.jpeg?w=1200",
        "trigger_radius_m": 45,
        "hours": "Open courtyard during army office hours",
        "fun_fact": "Today it is the HQ of the Italian Army Northern Command.",
    },
    {
        "name": "Pasticceria Marchesi 1824",
        "short_description": "Milan's oldest patisserie, where Verdi bought his cassoeula.",
        "long_description": "Founded in 1824 with original walnut counters and pastel boiserie. The almond panettoncini are baked from the same recipe used for nearly two centuries.",
        "latitude": 45.4670, "longitude": 9.1841,
        "address": "Via Santa Maria alla Porta 11A, 20123 Milano",
        "category": "Historic Patisserie",
        "image_url": "https://images.unsplash.com/photo-1512204925985-f52390a87fda?w=1200",
        "trigger_radius_m": 30,
        "hours": "Tue–Sun 07:30–20:00",
        "fun_fact": "Now part of Prada — but the 1824 décor is preserved.",
    },
    {
        "name": "Cortile della Magnolia",
        "short_description": "A secret courtyard with a centuries-old magnolia tree.",
        "long_description": "Step through an unassuming portone on Via dei Giardini and you'll find a peaceful private courtyard dominated by a vast flowering magnolia — an open secret among Brera locals.",
        "latitude": 45.4736, "longitude": 9.1908,
        "address": "Via dei Giardini 7, 20121 Milano",
        "category": "Hidden Courtyard",
        "image_url": "https://images.unsplash.com/photo-1636742943367-d79c45199670?w=1200",
        "trigger_radius_m": 35,
        "hours": "Daytime, residential courtyard",
        "fun_fact": "The magnolia blooms briefly in late March — a Brera ritual.",
    },
    {
        "name": "Studio Museo Francesco Messina",
        "short_description": "A sculptor's workshop turned museum inside a deconsecrated church.",
        "long_description": "The 17th-century Chiesa di San Sisto houses 80 sculptures and 25 drawings by Francesco Messina, donated to the city in 1974. Almost always empty.",
        "latitude": 45.4634, "longitude": 9.1812,
        "address": "Via San Sisto 4A, 20123 Milano",
        "category": "Hidden Museum",
        "image_url": "https://images.pexels.com/photos/18425415/pexels-photo-18425415.jpeg?w=1200",
        "trigger_radius_m": 40,
        "hours": "Tue–Sun 10:00–17:30",
        "fun_fact": "The bronze horses outside RAI's Rome HQ are by Messina.",
    },
    {
        "name": "Antica Barbieria Colla",
        "short_description": "Italy's oldest barbershop, opened in 1904.",
        "long_description": "Mahogany counters, original Belle Époque mirrors and a hand-mixed shaving cream called 'Crema 1904'. Booking weeks ahead is the norm for the wet shave.",
        "latitude": 45.4666, "longitude": 9.1896,
        "address": "Via Gerolamo Morone 3, 20121 Milano",
        "category": "Historic Shop",
        "image_url": "https://images.unsplash.com/photo-1615800098746-73af8261e3df?w=1200",
        "trigger_radius_m": 25,
        "hours": "Tue–Sat 09:00–19:00",
        "fun_fact": "Toscanini and Verdi were both Colla regulars.",
    },
    {
        "name": "Casa Museo Boschi Di Stefano",
        "short_description": "A 1930s apartment-museum stuffed with 300 Italian modernist masterpieces.",
        "long_description": "An almost-secret museum in a Piero Portaluppi flat, displaying works by Fontana, de Chirico, Sironi, Morandi and Boccioni — collected by a single Milanese couple.",
        "latitude": 45.4774, "longitude": 9.2042,
        "address": "Via Giorgio Jan 15, 20129 Milano",
        "category": "Hidden Museum",
        "image_url": "https://images.unsplash.com/photo-1512204925985-f52390a87fda?w=1200",
        "trigger_radius_m": 50,
        "hours": "Tue–Sun 10:00–17:30 (free)",
        "fun_fact": "Entry is completely free — a bequest condition.",
    },
    {
        "name": "Latteria di San Marco",
        "short_description": "A 12-table 1933 milk-bar, now serving Milanese home cooking.",
        "long_description": "No reservations, no menu cards, just blackboard specials and risotto al salto. Run for decades by the Maggi family — a portrait of pre-aperitivo Brera.",
        "latitude": 45.4754, "longitude": 9.1908,
        "address": "Via San Marco 24, 20121 Milano",
        "category": "Historic Trattoria",
        "image_url": "https://images.pexels.com/photos/18425415/pexels-photo-18425415.jpeg?w=1200",
        "trigger_radius_m": 25,
        "hours": "Mon–Fri 12:30–14:30, 19:30–22:30",
        "fun_fact": "Cash only, capacity ~24 people.",
    },
    {
        "name": "Chiostro dell'Umanitaria",
        "short_description": "A Renaissance cloister hidden inside a working social institute.",
        "long_description": "Two 15th-century cloisters with a peaceful well, often used for outdoor concerts. Walk straight in past the porter — almost no one realises it is open to the public.",
        "latitude": 45.4609, "longitude": 9.1972,
        "address": "Via San Barnaba 48, 20122 Milano",
        "category": "Hidden Cloister",
        "image_url": "https://images.pexels.com/photos/17355546/pexels-photo-17355546.jpeg?w=1200",
        "trigger_radius_m": 50,
        "hours": "Mon–Fri 09:00–18:00",
        "fun_fact": "Originally part of a 15th-century Franciscan convent.",
    },
    {
        "name": "Via Bagnera",
        "short_description": "Milan's narrowest street — and once its grisliest.",
        "long_description": "A 2.5m-wide medieval alley between Via Nerino and Via Santa Marta. In 1861 it was the scene of Milan's first serial-killer case (Antonio Boggia).",
        "latitude": 45.4626, "longitude": 9.1832,
        "address": "Via Bagnera, 20123 Milano",
        "category": "Historic Trace",
        "image_url": "https://images.unsplash.com/photo-1636742943367-d79c45199670?w=1200",
        "trigger_radius_m": 25,
        "hours": "Always accessible",
        "fun_fact": "Boggia was the last person publicly executed in Milan.",
    },
]


# Per-POI "voice" — opening line (the city's whisper) + interest tags.
# Keyed by POI name so we don't have to edit every dict literal above.
# `opening_line` is a {language_code: text} map. Add more languages later.
POI_METADATA = {
    "Orto Botanico di Brera": {
        "interest_tags": ["sceneries", "history", "curios"],
        "opening_line": {
            "en": "Beyond this gate, a 240-year-old ginkgo is waiting for you to look up.",
        },
    },
    "Cortile della Pinacoteca": {
        "interest_tags": ["art", "architecture", "history"],
        "opening_line": {
            "en": "Step inside — Napoleon, twice life-size, has been waiting for you in bronze.",
        },
    },
    "Fioraio Bianchi Caffè": {
        "interest_tags": ["food", "curios"],
        "opening_line": {
            "en": "Smell that? It's roses, and lunch, served at marble tables since 1976.",
        },
    },
    "Cimitero di San Marco (vestiges)": {
        "interest_tags": ["local_legends", "history"],
        "opening_line": {
            "en": "Look down — the stones beneath your feet were once tombstones. Mozart played near here at fourteen.",
        },
    },
    "Casa degli Atellani — Vigna di Leonardo": {
        "interest_tags": ["history", "sceneries", "local_legends"],
        "opening_line": {
            "en": "Leonardo's vines are still thirsty. The same soil he sketched in 1498 is right behind you.",
        },
    },
    "Libreria Bocca": {
        "interest_tags": ["art", "history", "shopping"],
        "opening_line": {
            "en": "Pages from 1775 are turning, slowly. Marinetti's Futurist manifestos started right here.",
        },
    },
    "Vicolo dei Lavandai": {
        "interest_tags": ["local_legends", "history", "sceneries"],
        "opening_line": {
            "en": "The last open-air laundry of Milan still echoes with washermen of the 1700s.",
        },
    },
    "Chiesa di San Carpoforo": {
        "interest_tags": ["history", "architecture", "art"],
        "opening_line": {
            "en": "An eleventh-century church is hosting today's young artists. Romanesque stones, modern hands.",
        },
    },
    "Bar Jamaica": {
        "interest_tags": ["curios", "history", "food"],
        "opening_line": {
            "en": "Hemingway's table is empty, but the photographs on these walls are still watching.",
        },
    },
    "Palazzo Cusani": {
        "interest_tags": ["architecture", "history"],
        "opening_line": {
            "en": "Two facades, two architects, one quiet quarrel in stone since 1719.",
        },
    },
    "Pasticceria Marchesi 1824": {
        "interest_tags": ["food", "history", "curios"],
        "opening_line": {
            "en": "Walnut counters from 1824. Ask for the panettoncini — Verdi did.",
        },
    },
    "Cortile della Magnolia": {
        "interest_tags": ["sceneries", "architecture", "local_legends"],
        "opening_line": {
            "en": "A magnolia is blooming behind that unmarked door. Brera's open secret.",
        },
    },
    "Studio Museo Francesco Messina": {
        "interest_tags": ["art", "architecture", "history"],
        "opening_line": {
            "en": "A 17th-century church now holds 80 sculptures. You'll likely have it to yourself.",
        },
    },
    "Antica Barbieria Colla": {
        "interest_tags": ["curios", "shopping", "history"],
        "opening_line": {
            "en": "A wet shave from 1904 is being prepared. Toscanini knew this scent.",
        },
    },
    "Casa Museo Boschi Di Stefano": {
        "interest_tags": ["art", "history"],
        "opening_line": {
            "en": "Three hundred modernist masterpieces are quietly hung in someone's living room. Free, always.",
        },
    },
    "Latteria di San Marco": {
        "interest_tags": ["food", "curios"],
        "opening_line": {
            "en": "Twelve tables. No menu. The risotto al salto would like you to sit down.",
        },
    },
    "Chiostro dell'Umanitaria": {
        "interest_tags": ["architecture", "sceneries", "history"],
        "opening_line": {
            "en": "Two Renaissance cloisters are open behind a porter's desk. Walk in.",
        },
    },
    "Via Bagnera": {
        "interest_tags": ["local_legends", "history"],
        "opening_line": {
            "en": "Milan's narrowest alley would like you to know it once held the city's last public execution.",
        },
    },
}


def _enrich_seed(p: dict) -> dict:
    meta = POI_METADATA.get(p["name"], {})
    return {
        **p,
        "interest_tags": meta.get("interest_tags", []),
        "opening_line": meta.get("opening_line", {}),
    }


async def seed_pois_if_empty() -> int:
    """Insert default POIs only if the collection is empty.
    Migrates stale documents (missing opening_line OR using the legacy
    5-tag taxonomy) by wiping and reseeding."""
    LEGACY_TAGS = {"hidden_gardens", "historic_cafes", "hidden_courtyards",
                   "renaissance_traces", "artisan_workshops"}
    count = await db.pois.count_documents({})
    if count > 0:
        # Detect stale schema or legacy tags and force a one-shot migration.
        stale = await db.pois.find_one({"opening_line": {"$exists": False}})
        legacy = await db.pois.find_one({"interest_tags": {"$in": list(LEGACY_TAGS)}})
        if stale is None and legacy is None:
            return 0
        logger.info("Detected stale/legacy POIs; reseeding…")
        await db.pois.delete_many({})
    docs = []
    for p in BRERA_POI_SEED:
        enriched = _enrich_seed(p)
        docs.append({
            "id": str(uuid.uuid4()),
            **enriched,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    if docs:
        await db.pois.insert_many(docs)
    return len(docs)


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@brera.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email, "name": "Brera Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin", "favorites": [],
            "interests": list(INTEREST_TAGS),
            "language": "en",
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
    else:
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
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
            )
            logger.info(f"Updated admin password for: {admin_email}")


@app.on_event("startup")
async def on_startup():
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
