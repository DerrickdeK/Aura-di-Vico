"""Tenant-aware read endpoints. ``GET /api/tenant`` exposes which
tenant is active for the request and which other tenants the deployment
supports. ``GET /api/tenant/{slug}/area`` returns a specific tenant's
area config, useful for future tenant-switchers in the admin UI.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from area_config import load_area_for, public_area
from tenants import available_tenants, resolve_tenant

router = APIRouter(tags=["tenants"])


@router.get("/tenant")
async def get_active_tenant(request: Request):
    """Return the active tenant for the current request plus the full
    roster of tenants this deployment supports (for admin switching)."""
    slug = resolve_tenant(request)
    return {
        "active": slug,
        "available": available_tenants(),
        "area": public_area(slug),
    }


@router.get("/tenant/{slug}/area")
async def get_tenant_area(slug: str):
    slug = slug.lower().strip()
    if slug not in set(available_tenants()):
        raise HTTPException(status_code=404, detail=f"No tenant '{slug}'.")
    # load_area_for silently falls back to the default when a file is
    # missing, so we explicitly check above.
    _ = load_area_for(slug)
    return public_area(slug)
