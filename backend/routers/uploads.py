"""Image upload router for authenticated users (contributors + admin).

Replaces the raw-URL paste flow on the contribution form. Accepts a
single JPEG/PNG/WebP ≤5MB, stores it in Emergent object storage with a
UUID path, and returns a backend-served URL that the frontend uses as
``image_url`` on contributions and POIs.

The download endpoint serves the raw bytes (public read) because all
POI/contribution images are meant to be visible in the app — there is
no private content. Authentication is only enforced on upload.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from deps import db, get_current_user
from storage import get_object, put_object

log = logging.getLogger("brera.uploads")

router = APIRouter(tags=["uploads"])

MAX_BYTES = 5 * 1024 * 1024       # 5 MB
ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/png":  "png",
    "image/webp": "webp",
}


@router.post("/uploads/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a single image. Returns ``{url, id, size, content_type}``."""
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415,
                            detail="Only JPEG, PNG, or WebP images are accepted.")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 5 MB.")

    file_id = str(uuid.uuid4())
    ext = ALLOWED_MIME[content_type]
    path = f"aura-discover/uploads/{user['id']}/{file_id}.{ext}"

    try:
        result = put_object(path, data, content_type)
    except RuntimeError as err:
        log.error("put_object failed: %s", err)
        raise HTTPException(status_code=502,
                            detail="Image storage is temporarily unavailable.")

    stored_path = result.get("path", path)
    await db.uploads.insert_one({
        "id": file_id,
        "storage_path": stored_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": len(data),
        "uploader_id": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Relative URL the frontend can drop straight into an <img src>.
    # REACT_APP_BACKEND_URL + this path resolves to GET /api/uploads/{id}.
    return {
        "id": file_id,
        "url": f"/api/uploads/{file_id}",
        "size": len(data),
        "content_type": content_type,
    }


@router.get("/uploads/{file_id}")
async def download_image(file_id: str):
    """Public read — images are displayed everywhere in the app."""
    record = await db.uploads.find_one(
        {"id": file_id, "is_deleted": False},
        {"_id": 0},
    )
    if not record:
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        data, content_type = get_object(record["storage_path"])
    except Exception as err:
        log.error("get_object failed for %s: %s", file_id, err)
        raise HTTPException(status_code=502, detail="Image storage is temporarily unavailable.")

    return Response(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/me/uploads")
async def list_my_uploads(
    user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
):
    """Recent uploads by the current user — useful for the contribution
    form's reuse / preview flow."""
    docs = await db.uploads.find(
        {"uploader_id": user["id"], "is_deleted": False},
        {"_id": 0, "id": 1, "size": 1, "content_type": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(limit)
    for d in docs:
        d["url"] = f"/api/uploads/{d['id']}"
    return docs
