"""Thin wrapper around the Emergent Object Storage API. Exposes
``put_object`` / ``get_object`` helpers used by the uploads router. The
session-scoped ``storage_key`` is fetched lazily and cached for the
lifetime of the process (renewed on 403)."""
from __future__ import annotations

import logging
import os
from typing import Any

import requests

log = logging.getLogger("brera.storage")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "aura-discover"

_storage_key: str | None = None


def _emergent_key() -> str:
    key = (os.environ.get("EMERGENT_LLM_KEY") or "").strip()
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured; uploads disabled.")
    return key


def init_storage(force: bool = False) -> str:
    """Obtain a session-scoped storage key. Cached unless ``force`` is
    true (used to recover from 403 expirations)."""
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": _emergent_key()},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    log.info("Storage initialised.")
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict[str, Any]:
    key = init_storage()
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
        if resp.status_code == 403:
            # Session key expired — refresh and retry once.
            key = init_storage(force=True)
            resp = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                data=data,
                timeout=120,
            )
        resp.raise_for_status()
    except requests.HTTPError as err:
        log.error("Upload failed (%s): %s", resp.status_code, resp.text[:200])
        raise RuntimeError(f"Object storage error {resp.status_code}") from err
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        key = init_storage(force=True)
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
