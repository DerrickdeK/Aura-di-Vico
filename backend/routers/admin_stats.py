"""Admin gift-stats aggregation: total itineraries, total views, top
senders, and a 30-day daily-creation sparkline. Powers the tiny stats
card on /admin — gives the lead curator a feel for how the
"Itineraries as Gifts" feature is being used.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends

from deps import db, require_admin

router = APIRouter(prefix="/admin", tags=["admin-stats"])


def _iso_day(ts: str | None) -> str | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts).date().isoformat()
    except (ValueError, TypeError):
        return None


@router.get("/gift-stats")
async def gift_stats(_: dict = Depends(require_admin)) -> dict[str, Any]:
    """Return a JSON blob with:
      * `total_gifts`     — lifetime count of itineraries
      * `total_views`     — sum of view_count across all gifts
      * `last_30_days`    — list of 30 {day, count} entries for the sparkline
      * `top_senders`     — top 5 {sender_name, count} pairs
      * `recent_gifts`    — 5 most recent {slug, sender_name, recipient_name, created_at, view_count}
    """
    total_gifts = await db.itineraries.count_documents({})

    # Views total + top senders via aggregation
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_views": {"$sum": {"$ifNull": ["$view_count", 0]}},
            }
        }
    ]
    view_doc = await db.itineraries.aggregate(pipeline).to_list(1)
    total_views = (view_doc[0]["total_views"] if view_doc else 0) or 0

    # 30-day sparkline
    cutoff = datetime.now(timezone.utc) - timedelta(days=29)
    cutoff_iso = cutoff.date().isoformat()
    recent = await db.itineraries.find(
        {"created_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0, "created_at": 1},
    ).to_list(10_000)
    day_counts: Counter[str] = Counter()
    for doc in recent:
        day = _iso_day(doc.get("created_at"))
        if day and day >= cutoff_iso:
            day_counts[day] += 1
    sparkline = []
    for i in range(30):
        d = (cutoff + timedelta(days=i)).date().isoformat()
        sparkline.append({"day": d, "count": day_counts.get(d, 0)})

    # Top senders (case-preserving)
    sender_pipeline = [
        {"$group": {"_id": {"$ifNull": ["$sender_name", "Anonymous"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_docs = await db.itineraries.aggregate(sender_pipeline).to_list(5)
    top_senders = [{"sender_name": d["_id"], "count": d["count"]} for d in top_docs]

    # 5 most recent
    recent_docs = await db.itineraries.find(
        {},
        {"_id": 0, "slug": 1, "sender_name": 1, "recipient_name": 1,
         "created_at": 1, "view_count": 1},
    ).sort("created_at", -1).to_list(5)

    return {
        "total_gifts": total_gifts,
        "total_views": total_views,
        "last_30_days": sparkline,
        "top_senders": top_senders,
        "recent_gifts": recent_docs,
    }
