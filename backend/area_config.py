"""Load the area (city/campus) configuration that turns this codebase
into a reusable template. The JSON file is the SINGLE source of truth
for every city-specific thing: brand name, map center, palette, POIs,
and landing-page landmarks.

Path resolution order:
  1. $AREA_CONFIG_PATH (absolute or relative to the repo root)
  2. /app/area.config.json  (default)
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

_DEFAULT_PATH = Path("/app/area.config.json")
_cache: dict[str, Any] | None = None


def _resolve_path() -> Path:
    override = os.environ.get("AREA_CONFIG_PATH")
    if override:
        p = Path(override)
        if not p.is_absolute():
            p = Path("/app") / p
        return p
    return _DEFAULT_PATH


def load_area() -> dict:
    """Read + cache the area config. Safe to call many times."""
    global _cache
    if _cache is not None:
        return _cache
    path = _resolve_path()
    if not path.exists():
        raise RuntimeError(f"Area config not found at {path}. Set AREA_CONFIG_PATH or create {_DEFAULT_PATH}.")
    with path.open("r", encoding="utf-8") as f:
        _cache = json.load(f)
    log.info("Area config loaded: slug=%s (%s)", _cache.get("slug"), path)
    return _cache


def reload_area() -> dict:
    """Drop the cache and re-read. Useful in tests."""
    global _cache
    _cache = None
    return load_area()


def pois_seed() -> list[dict]:
    """POI seed list with opening_line + interest_tags inlined. Each dict
    is already shaped for insertion into the `pois` collection."""
    cfg = load_area()
    return list(cfg.get("pois", []))


def landmarks_dict() -> dict[str, dict]:
    """Map id -> landmark for the backend landmark-chat endpoint. Each
    landmark exposes name/short_description/long_description/canonical_facts
    so the Claude persona prompt has the same shape as a real POI."""
    cfg = load_area()
    out: dict[str, dict] = {}
    for lm in cfg.get("landmarks", []):
        lid = lm["id"]
        out[lid] = {
            "id": lid,
            "name": lm["name"].get("en") or lm["name"].get("it") or lid,
            "address": lm.get("address", ""),
            "short_description": lm.get("short_description", ""),
            "long_description": lm.get("long_description", ""),
            "fun_fact": lm.get("fun_fact"),
            "canonical_facts": lm.get("canonical_facts", []),
            "opening_line": lm.get("voice", {}),
        }
    return out


def public_area() -> dict:
    """Subset of the config returned by GET /api/area — no heavy seed
    data, just what the frontend needs to render brand/map/landmarks."""
    cfg = load_area()
    return {
        "slug": cfg.get("slug"),
        "brand": cfg.get("brand", {}),
        "area": cfg.get("area", {}),
        "city": cfg.get("city", {}),
        "tagline": cfg.get("tagline", {}),
        "map": cfg.get("map", {}),
        "palette": cfg.get("palette", {}),
        "landmarks": cfg.get("landmarks", []),
    }


def merged_area(overrides: dict | None = None) -> dict:
    """Return the public-area payload with admin overrides layered on top.

    Keys that look like localised text maps (brand/area/city/tagline) and
    the flat palette dict are shallow-merged (override keys win, other
    keys pass through from the JSON). Map and landmarks are replaced
    wholesale when provided.
    """
    base = public_area()
    if not overrides:
        return base
    out = dict(base)
    for k in ("slug",):
        if k in overrides and overrides[k]:
            out[k] = overrides[k]
    for k in ("brand", "area", "city", "tagline"):
        if k in overrides and isinstance(overrides[k], dict):
            out[k] = {**base.get(k, {}), **overrides[k]}
    if isinstance(overrides.get("map"), dict):
        out["map"] = {**base.get("map", {}), **overrides["map"]}
    if isinstance(overrides.get("palette"), dict):
        out["palette"] = {**base.get("palette", {}), **overrides["palette"]}
    if isinstance(overrides.get("landmarks"), list):
        out["landmarks"] = overrides["landmarks"]
    return out


def merged_landmarks_dict(overrides: dict | None = None) -> dict[str, dict]:
    """Same shape as landmarks_dict() but respects admin overrides.
    Used by the landmark-chat endpoint so Claude speaks with the
    overridden persona if the admin has edited it."""
    source = merged_area(overrides).get("landmarks", [])
    out: dict[str, dict] = {}
    for lm in source:
        lid = lm.get("id")
        if not lid:
            continue
        out[lid] = {
            "id": lid,
            "name": (lm.get("name") or {}).get("en") or (lm.get("name") or {}).get("it") or lid,
            "address": lm.get("address", ""),
            "short_description": lm.get("short_description", ""),
            "long_description": lm.get("long_description", ""),
            "fun_fact": lm.get("fun_fact"),
            "canonical_facts": lm.get("canonical_facts", []),
            "opening_line": lm.get("voice", {}),
        }
    return out
