"""Multi-tenant resolver.

A single deployment can serve multiple cities. The active tenant slug is
resolved from, in order of precedence:

  1. ``X-Tenant-Slug`` request header (useful for API clients / tests)
  2. ``?tenant=<slug>`` query parameter (useful for previews)
  3. First DNS label of the request hostname (``brera.app`` → ``brera``,
     ``trastevere.aura.app`` → ``trastevere``)
  4. ``DEFAULT_TENANT_SLUG`` environment variable
  5. The slug baked into the currently-loaded ``area.config.json``

Only slugs that match a ``/app/configs/<slug>.json`` file are honoured;
unknown slugs fall through to the default so a typo in a subdomain
never 404s the whole site.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from fastapi import Request

CONFIGS_DIR = Path("/app/configs")

# Hostnames that should NOT be treated as tenant subdomains (preview envs,
# localhost, etc. — their DNS label is not a tenant).
_NON_TENANT_HOSTS: Iterable[str] = (
    "localhost", "127.0.0.1", "0.0.0.0",
    "preview.emergentagent.com",
)


def available_tenants() -> list[str]:
    """List slugs that have a matching /app/configs/<slug>.json file,
    plus the built-in default config slug (`brera-milano`)."""
    slugs = {"brera-milano"}  # default area.config.json
    if CONFIGS_DIR.is_dir():
        for p in CONFIGS_DIR.glob("*.json"):
            slugs.add(p.stem)
    return sorted(slugs)


def default_tenant() -> str:
    """Slug used when no tenant can be resolved from the request.

    Falls back to the slug of the currently-loaded ``/app/area.config.json``
    (via ``AREA_CONFIG_PATH``), then to ``brera-milano``. Set
    ``DEFAULT_TENANT_SLUG`` to override explicitly."""
    explicit = (os.environ.get("DEFAULT_TENANT_SLUG") or "").strip()
    if explicit:
        return explicit
    try:
        from area_config import load_area
        return (load_area().get("slug") or "brera-milano").strip()
    except Exception:
        return "brera-milano"


def _subdomain_of(host: str) -> str | None:
    """Return the first DNS label iff it's tenant-safe."""
    host = (host or "").lower().split(":")[0]
    if not host or any(h in host for h in _NON_TENANT_HOSTS):
        return None
    parts = host.split(".")
    if len(parts) < 3:
        return None                   # apex domain — no subdomain
    sub = parts[0]
    if sub in {"www", "api", "admin"}:
        return None
    return sub or None


def resolve_tenant(request: Request) -> str:
    """Return the active tenant slug for this request. Always returns a
    valid, resolvable slug (falls back to the default)."""
    tenants = set(available_tenants())

    # 1. Header
    header = request.headers.get("X-Tenant-Slug", "").strip().lower()
    if header and header in tenants:
        return header

    # 2. Query parameter
    qp = (request.query_params.get("tenant") or "").strip().lower()
    if qp and qp in tenants:
        return qp

    # 3. Subdomain
    sub = _subdomain_of(request.headers.get("host", ""))
    if sub and sub in tenants:
        return sub

    # 4 / 5. Default
    return default_tenant()
