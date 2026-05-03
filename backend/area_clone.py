"""AI-assisted draft-config generator for the templatisation wizard.

Given a city/area name, ask Claude Sonnet 4.5 to return a starter
``area.config.json`` payload with sensible brand/palette/map/landmarks/
POI defaults. The admin then edits the draft live in ``/admin/area`` and
either saves it as overrides or downloads the JSON.

The prompt is deliberately strict JSON-only so the output can be parsed
without regex acrobatics. We do a best-effort ``json.loads`` and raise
an HTTPException with the raw model output on failure so the admin can
see what went wrong.
"""
from __future__ import annotations

import json
import logging
import os
import re
import unicodedata
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("brera.area_clone")

MODEL_PROVIDER = "anthropic"
MODEL_NAME     = "claude-sonnet-4-5-20250929"
MAX_OUTPUT     = 3800   # Enough for brand/palette/map + 4 compact landmarks.
                        # Schema intentionally minimal — the admin fills
                        # canonical_facts/fun_fact/images later via the UI.


def _slugify(text: str) -> str:
    base = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^A-Za-z0-9]+", "-", base).strip("-").lower()
    return base or "area"


SYSTEM_PROMPT = """You are a senior travel editor helping bootstrap a "whisper-first" walking-discovery web app.

Given an area name, return a MINIMAL starter configuration — brand, palette, map centre, and 4 well-known landmarks. The admin will add POIs and deeper landmark details later by hand.

Rules (CRITICAL):
- Output ONE valid JSON object matching the schema. NO prose, NO markdown fences, NO comments.
- Keep EVERY string SHORT. The "intro" paragraphs must be 30–40 words each. "note" is one short sentence. "voice" is one poetic line under 18 words.
- Every landmark must be a real place. Coordinates: 4 decimal places; prefer slight imprecision over invented points.
- Palette: 11 hex colours evocative of the area (coastal → blues/whites/terracotta; mountain → deep greens/ochres; historic old town → warm cream / burnt red / deep green). `terracotta` is the primary accent.
- Bilingual strings: provide BOTH `it` (Italian) AND `en` (English). Idiomatic, not literal.

REQUIRED SCHEMA — return EXACTLY these keys, no extras:
{
  "slug": "kebab-slug",
  "brand":   {"it": "Aura di X", "en": "Aura di X"},
  "area":    {"it": "...", "en": "..."},
  "city":    {"it": "...", "en": "..."},
  "tagline": {"it": "3–6 words", "en": "3–6 words"},
  "map":   { "center": {"lat": 0.0, "lng": 0.0}, "default_zoom": 15, "landing_zoom": 14 },
  "palette": {
    "bg": "#RRGGBB", "surface": "#RRGGBB", "map-water": "#RRGGBB",
    "text-primary": "#RRGGBB", "text-secondary": "#RRGGBB", "text-tertiary": "#RRGGBB",
    "inverse": "#RRGGBB", "terracotta": "#RRGGBB", "deep-green": "#RRGGBB",
    "warm-ochre": "#RRGGBB", "border": "#RRGGBB"
  },
  "landmarks": [
    {
      "id": "kebab",
      "name":  {"it": "...", "en": "..."},
      "note":  {"it": "1 sentence IT", "en": "1 sentence EN"},
      "voice": {"it": "1 line IT, <18 words", "en": "1 line EN, <18 words"},
      "intro": {"it": "30–40 words IT paragraph", "en": "30–40 words EN paragraph"},
      "latitude": 0.0000,
      "longitude": 0.0000,
      "address": "street, postcode city",
      "short_description": "1-line EN blurb",
      "canonical_facts": []
    }
  ]
}

Landmarks array length: EXACTLY 4. Return ONLY the JSON.
"""


def _build_user_prompt(city_name: str, country: str | None, vibe: str | None) -> str:
    parts = [f"Area to clone: **{city_name}**"]
    if country:
        parts.append(f"Country: {country}")
    if vibe:
        parts.append(f"Curator's vibe hint: {vibe}")
    parts.append("\nProduce the full JSON now.")
    return "\n".join(parts)


def _extract_json(raw: str) -> dict:
    """Claude usually obeys 'no markdown', but occasionally wraps in ```json.
    Strip code fences if present, then json.loads."""
    s = (raw or "").strip()
    if s.startswith("```"):
        # remove first fence + optional language tag
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE).rstrip("`").strip()
        # remove trailing fence
        if s.endswith("```"):
            s = s[:-3].strip()
    return json.loads(s)


async def suggest_area(city_name: str, country: Optional[str] = None,
                       vibe: Optional[str] = None,
                       session_id: Optional[str] = None) -> dict:
    """Ask Claude for a starter area config. Raises RuntimeError on LLM
    failure or JSON-parse failure — caller should surface as HTTP 502."""
    api_key = (os.environ.get("EMERGENT_LLM_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured; clone wizard disabled.")

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id or f"area-clone-{_slugify(city_name)}",
        system_message=SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME).with_params(max_tokens=MAX_OUTPUT)

    user_text = _build_user_prompt(city_name, country, vibe)
    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as err:
        logger.error("Clone LLM call failed: %s", err, exc_info=True)
        raise RuntimeError(f"Claude call failed: {err}") from err

    try:
        data = _extract_json(raw or "")
    except json.JSONDecodeError as err:
        logger.error("Clone LLM returned non-JSON: %s", (raw or "")[:400])
        raise RuntimeError(f"Model did not return JSON: {err}") from err

    # Force a URL-safe slug even if the model returned something weird.
    if not data.get("slug"):
        data["slug"] = _slugify(city_name)
    else:
        data["slug"] = _slugify(str(data["slug"]))
    return data
