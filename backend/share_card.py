"""Open-Graph preview image + share-redirect HTML for gifted itineraries.

Why this exists
---------------
When a gift link is pasted into WhatsApp / iMessage / Slack / email, the
unfurler bot fetches the URL and reads <meta property="og:*"> tags to render
a preview card. React SPAs serve a static index.html so per-slug OG tags
aren't possible from the frontend. We solve it by serving the share URL
from the FastAPI backend instead — the bot reads our HTML and sees a
personalised preview, while real browsers follow the embedded redirect to
the actual SPA route.

Two endpoints:
  • GET /api/share/{slug}                 → tiny HTML with og:* meta tags
                                            + meta-refresh + JS fallback
                                            redirect to /gift/{slug}.
  • GET /api/og-image/itineraries/{slug}  → 1200×630 PNG composed at
                                            request time by Pillow, with
                                            sender / recipient / POI count.
"""
from __future__ import annotations

import io
import logging
import re
from html import escape as html_escape

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("brera.share")

# ── Image dimensions ────────────────────────────────────────────────────
OG_W, OG_H = 1200, 630
# Brera palette (kept in sync with frontend CSS variables).
BG = (245, 240, 232)        # cream
TERRACOTTA = (192, 86, 64)
TEXT_PRIMARY = (40, 32, 28)
TEXT_SECONDARY = (110, 95, 85)


def _pick_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    """Return the first font that exists; fall back to the bitmap default."""
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


SERIF_REGULAR = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
]
SERIF_ITALIC = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf",
]
SANS_REGULAR = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    """Greedy word-wrap using Pillow text-length measurement."""
    words = (text or "").split()
    lines: list[str] = []
    current = ""
    for w in words:
        candidate = (current + " " + w).strip()
        if draw.textlength(candidate, font=font) <= max_w:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def render_og_image(sender: str, recipient: str, poi_count: int, lang: str = "it") -> bytes:
    """Compose the 1200×630 preview PNG and return it as bytes."""
    img = Image.new("RGB", (OG_W, OG_H), BG)
    draw = ImageDraw.Draw(img)

    # Decorative left bar
    draw.rectangle([(0, 0), (24, OG_H)], fill=TERRACOTTA)

    eyebrow_font = _pick_font(SANS_REGULAR, 22)
    headline_font = _pick_font(SERIF_REGULAR, 78)
    sub_font = _pick_font(SERIF_ITALIC, 36)
    foot_font = _pick_font(SANS_REGULAR, 24)

    pad_x = 80
    text_max_w = OG_W - pad_x * 2

    # Top eyebrow
    eyebrow = "BRERA · MILANO" if lang != "it" else "BRERA · MILANO"
    draw.text((pad_x, 60), eyebrow, font=eyebrow_font, fill=TERRACOTTA, spacing=8)

    # Headline
    if lang == "it":
        headline = f"{sender} ha invitato {recipient} a camminare per Brera."
    else:
        headline = f"{sender} has invited {recipient} for a walk through Brera."
    headline_lines = _wrap(draw, headline, headline_font, text_max_w)[:3]
    y = 130
    for line in headline_lines:
        draw.text((pad_x, y), line, font=headline_font, fill=TEXT_PRIMARY)
        y += 92

    # Subhead
    if lang == "it":
        sub = f"Una passeggiata di {poi_count} luoghi sussurrati, scelti per te."
    else:
        sub = f"A walk of {poi_count} whispered places, chosen for you."
    draw.text((pad_x, y + 12), sub, font=sub_font, fill=TEXT_SECONDARY)

    # Footer
    draw.text((pad_x, OG_H - 70), "brera-discover · whisper-first walking", font=foot_font, fill=TEXT_SECONDARY)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def _safe_slug(slug: str) -> str:
    """Reject anything that isn't url-safe-base64-ish so we don't echo arbitrary
    user content into the HTML response."""
    return slug if re.fullmatch(r"[A-Za-z0-9_-]{1,32}", slug) else ""


def render_share_html(itinerary: dict, frontend_url: str, og_image_url: str) -> str:
    """Tiny, no-JS-required HTML that:
      • exposes og:* / twitter:card meta tags for unfurlers
      • redirects real browsers to /gift/{slug} via meta-refresh + JS fallback.
    """
    slug = _safe_slug(itinerary.get("slug", ""))
    sender = html_escape(itinerary.get("sender_name", "") or "")
    recipient = html_escape(itinerary.get("recipient_name", "") or "")
    n = len(itinerary.get("poi_ids", []) or [])
    lang = (itinerary.get("language") or "it").lower()
    if lang == "it":
        title = f"{sender} ha invitato {recipient} a camminare per Brera"
        desc = f"Un dono: una passeggiata di {n} luoghi sussurrati, scelti con cura."
    else:
        title = f"{sender} has invited {recipient} for a walk through Brera"
        desc = f"A gift: a walk of {n} whispered places, chosen with care."
    canonical = f"{frontend_url.rstrip('/')}/gift/{slug}"

    # Note: meta-refresh runs on every browser even with JS disabled. The
    # JS fallback handles the rare case of refresh-disabled browsers.
    return f"""<!doctype html>
<html lang="{html_escape(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html_escape(title)}</title>
<meta name="description" content="{html_escape(desc)}">

<meta property="og:type" content="website">
<meta property="og:title" content="{html_escape(title)}">
<meta property="og:description" content="{html_escape(desc)}">
<meta property="og:image" content="{html_escape(og_image_url)}">
<meta property="og:image:width" content="{OG_W}">
<meta property="og:image:height" content="{OG_H}">
<meta property="og:url" content="{html_escape(canonical)}">
<meta property="og:locale" content="{'it_IT' if lang == 'it' else 'en_US'}">
<meta property="og:site_name" content="Brera Discover">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html_escape(title)}">
<meta name="twitter:description" content="{html_escape(desc)}">
<meta name="twitter:image" content="{html_escape(og_image_url)}">

<link rel="canonical" href="{html_escape(canonical)}">
<meta http-equiv="refresh" content="0; url={html_escape(canonical)}">
<style>body{{font-family:system-ui,-apple-system,sans-serif;background:#f5f0e8;color:#28201c;margin:0;padding:5rem 1.5rem;text-align:center}}a{{color:#c05640}}</style>
</head>
<body>
<p>Apertura del dono…</p>
<p><a href="{html_escape(canonical)}">Tocca qui se non ti reindirizza automaticamente.</a></p>
<script>window.location.replace({canonical!r});</script>
</body>
</html>"""
