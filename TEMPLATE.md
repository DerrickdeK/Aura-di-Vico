# Whisper City Template — How to re-skin for a new city/campus

This codebase ships with **one JSON file** that controls every city-specific
thing: brand name, map center, palette, landing-page landmarks, and the
default POI seed. Fork the repo, edit that one file, and you have a new
city/campus deployment.

## 1. The file

`/app/area.config.json`

```jsonc
{
  "slug":  "trastevere-roma",
  "brand": { "en": "Aura di Trastevere", "it": "Aura di Trastevere" },
  "area":  { "en": "Trastevere",         "it": "Trastevere" },
  "city":  { "en": "Rome",               "it": "Roma" },
  "tagline": { "en": "the artisan quarter", "it": "il quartiere degli artigiani" },
  "map":    { "center": { "lat": 41.8892, "lng": 12.4682 }, "default_zoom": 15, "landing_zoom": 14 },
  "palette":{ "terracotta": "#A04030", "deep-green": "#2C3E34", "warm-ochre": "#B88A3C", /* …all CSS vars… */ },
  "landmarks": [ /* 3–8 well-known anchors for the landing page map */ ],
  "pois":      [ /* ≥18 hidden points of interest that power the experience */ ]
}
```

Every `{area}` / `{city}` / `{brand}` placeholder in the UI translation
strings is automatically resolved from the block above — no i18n edits
needed.

## 2. What you must change per fork

| Field                 | What it controls                                   |
| --------------------- | -------------------------------------------------- |
| `slug`                | Logging / analytics / future multi-tenant key      |
| `brand`               | Header logo wordmark (per language)                |
| `area`, `city`        | "{area} · {city}" label on Map + Listen pages      |
| `tagline`             | Hero eyebrow line                                  |
| `map.center`          | Default map center when GPS is unavailable         |
| `palette.*`           | CSS `--terracotta`, `--deep-green`, `--warm-ochre` |
| `landmarks[]`         | 3–8 pins on the landing-page map                   |
| `pois[]`              | ≥18 "hidden" spots seeded into MongoDB on boot     |

## 3. Swapping config without forking

Point the backend at a different file via env var:

```bash
export AREA_CONFIG_PATH=/app/configs/trastevere.json
sudo supervisorctl restart backend
```

The path is resolved relative to `/app/` unless absolute.

## 4. Reseeding POIs

After editing `pois`, wipe the existing POI collection from the admin
UI (`/admin` → "Empty POI database") and restart the backend — new
POIs are inserted automatically on the next boot.

`POST /api/pois/reset`  → empties the collection (admin only)
`POST /api/pois/seed`   → re-inserts the config seed (admin only)

## 5. API

Anything a frontend needs to re-skin this codebase lives at:

```
GET /api/area   → { slug, brand, area, city, tagline, map, palette, landmarks }
```

Heavy seed data (`pois`) is not exposed — the POIs live in MongoDB and are
fetched via `GET /api/pois`.

## 6. Roadmap beyond Option A (Minimum Viable)

- **Option B — Polished template**: Admin "Area Settings" page with
  upload-a-CSV for POIs, colour-picker for palette, live preview.
- **Option C — Multi-tenant**: `AREA_CONFIG_PATH` resolved from the
  request host (e.g. `brera.app` vs `trastevere.app`), tenant-scoped
  MongoDB collections.
