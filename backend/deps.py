"""Shared runtime dependencies for router modules under /app/backend/routers/.

This module is the seed of the progressive server.py → routers/ migration.
New features live here; older endpoints stay in server.py until we have
time to move them. Both sides share the same Mongo client + JWT settings,
so cross-module auth is seamless.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not configured.")
    return secret


async def get_current_user(request: Request) -> dict:
    """Mirror of server.get_current_user. Decodes the access_token cookie
    (or Authorization header) and returns the user document with _id
    stripped."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
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


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
