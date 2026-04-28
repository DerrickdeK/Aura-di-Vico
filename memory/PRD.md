# Brera Discover — Product Requirements Document

## Original Problem Statement
> "My project is to enable visitors of any designated urban area (in this case the sector of Brera in Milan) to discover little or unknown points of interest (POI) indicated on a geo-positioning referenced platform map thanks to a signal sent to their smartphone, watch, or glasses."

The "signal" is a vibration whose intensity/frequency varies with proximity to the nearest POI, doubling as both identification and direction cue.

## Architecture
- **Frontend**: React (CRA + craco) PWA, react-leaflet (OSM tiles), framer-motion, react-router-dom 7, axios.
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt. Cookie-based JWT (httpOnly, samesite=none, secure=true). All routes prefixed `/api`.
- **DB**: MongoDB collections: `users`, `pois`, `visits`, `password_reset_tokens`, `login_attempts` (TTL+unique indexes set on startup).
- **Auth**: register / login / logout / me / refresh / forgot-password / reset-password. Pre-seeded admin (`admin@brera.app`). Pre-auth brute-force lockout keyed by email (5 attempts → 15 min).
- **POIs**: 18 hand-curated lesser-known Brera spots auto-seeded if collection empty (Orto Botanico, Cortile Pinacoteca, Bar Jamaica, Vicolo dei Lavandai, Vigna di Leonardo, etc.).

## User Personas
1. **Visitor / Wanderer** — opens the app while strolling Brera, allows geolocation, feels their device buzz when near a hidden spot, taps to read the story.
2. **Registered User** — same as visitor + saves favorites and keeps an automatic visit journal.
3. **Curator / Admin** — adds, edits, deletes POIs through an admin dashboard; can wipe the DB so a class of students can populate it from scratch, or re-seed defaults.

## Core Requirements (static)
- Mobile-first PWA, full-screen interactive map of Brera.
- Custom map markers (deep-green undiscovered, ochre in-range, terracotta visited).
- Live user position with pulsing dot.
- Proximity radar widget showing distance + bearing to nearest POI.
- Vibration API: pulse interval 40-130 ms / pause 120-1020 ms scaling with distance; continuous buzz inside 8 m; off beyond 4× trigger radius.
- Bottom-sheet POI drawer with hero image, story, address, hours, fun fact, favorite toggle.
- User accounts (JWT cookie auth) with favorites + auto-recorded visits.
- Admin POI CRUD + reset-empty / re-seed defaults.

## What's Been Implemented (2026-04-28)
- Backend `/api/auth/*`, `/api/pois/*`, `/api/me/favorites/*`, `/api/me/visits` — all working.
- 18 Brera POIs auto-seeded.
- Frontend pages: Map (`/`), Login, Register, Favorites, Visits, Admin.
- Custom Leaflet markers, proximity radar, animated POI drawer, bottom nav (with admin tab gated by role).
- Vibration patterns + auto visit recording on entering trigger radius.
- Admin: full CRUD form + reset/reseed flows with confirmation.
- Tests: 23 backend pytest cases (22 passing pre-fix, all green after the brute-force fix); Playwright e2e of map + admin + auth flows.

## Recent Fixes (2026-04-28, post-test agent iteration 1)
- **Backend**: brute-force lockout identifier switched from `(ip:email)` → `email` so the counter survives k8s ingress proxy IP rotation.
- **Frontend**: added a CSS media query that lifts the floating "Made with Emergent" badge above the bottom nav on screens ≤640 px so all nav tabs stay tappable.
- **Frontend**: POI drawer category chip now uses solid dark background for legibility over the hero image.

## Prioritized Backlog
- **P1** — Add a "Reset successful" toast and an admin field for image upload (currently URL only).
- **P1** — Service worker + manifest.json for installable PWA + offline tile caching.
- **P2** — Web Push (works when tab closed) for visitors who want to be paged when nearing a POI.
- **P2** — Public sharing pages: `/place/<slug>` for individual POIs (SEO + social cards).
- **P2** — Multi-area support (toggle to switch from Brera to other curated districts).
- **P3** — Native wearable bridge (smartwatch via Capacitor / glasses).
- **P3** — Heatmap of community visits, "trail of the day" suggestions.
- **P3** — Admin bulk import (CSV / GeoJSON).

## Test Credentials
- Admin: `admin@brera.app` / `BreraAdmin2026!`
