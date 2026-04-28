# Brera Discover — Product Requirements Document

## Original Problem Statement
> "My project is to enable visitors of any designated urban area (in this case the sector of Brera in Milan) to discover little or unknown points of interest (POI) indicated on a geo-positioning referenced platform map thanks to a signal sent to their smartphone, watch, or glasses."

User refinement (iter 2):
> "The whole - original - idea was for the POI to seek the visitor and not the other way around. I intended this to be a first where the city is actually 'talking' to you."

## Architecture
- **Frontend**: React (CRA + craco) PWA, react-leaflet (kept for admin only), framer-motion, react-router-dom 7, axios. Web Audio API for chimes, Vibration API for haptics, Notifications API + service worker for background calls.
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt. Cookie-based JWT (httpOnly, samesite=none, secure=true). All routes under `/api`.
- **DB**: MongoDB collections: `users`, `pois`, `visits`, `discoveries`, `password_reset_tokens`, `login_attempts` (TTL+unique indexes set on startup).
- **Auth**: register/login/logout/me/refresh/forgot/reset; pre-seeded admin; brute-force lockout keyed by email.
- **i18n**: 7 supported languages (en/it/es/de/el/fr/pt). English/Italian fully translated; others fall back to English copy with their native name shown in pickers.

## Personas
1. **Wanderer** — opens the app while strolling Brera. The home is the *Listening* canvas; POIs are invisible until they sense the visitor and start whispering. Vibration + chime cue zones (sensed/called/found).
2. **Registered User** — same as wanderer + interest filter (city only whispers what matches), language preference, opt-in background notifications, "Whispers collected" journal.
3. **Curator / Admin** — adds, edits, deletes POIs; sets per-language `opening_line` (the city's whisper) + `interest_tags`. Can wipe the DB so a class of students can populate it from scratch, or re-seed defaults.

## Core Mechanics — "The City Talks"
- Three concentric proximity zones around each POI:
  - **Sensed** (≤200 m): anonymous tease ("Something is watching you, 140 m north-east"). Soft 520 Hz chime + gentle vibration `[60,80,60]`.
  - **Called** (≤80 m): name + opening line revealed ("Beyond this gate, a 240-year-old ginkgo is waiting…"). 660 Hz chime + `[80,60,80,60,120]`.
  - **Found** (≤25 m): full story drawer auto-opens. 880 Hz chime + `[400,80,400]`.
- Each zone-upgrade triggers vibration, chime, optional Web Push notification, and persists a `discoveries` doc.
- Background notifications opt-in via service worker.
- Listening compass: motes appear on a compass ring at the POI's bearing, distance-mapped placement; only POIs that have already sensed the visitor become visible.
- A built-in **Ghost-walk simulator** lets desktop visitors experience the whole flow without GPS.

## What's Been Implemented (latest session)
**Iteration 1 (initial MVP):** Full map + auth + favorites + visits + admin CRUD with editorial Milanese aesthetic. 23 backend tests, two issues fixed (brute-force counter behind ingress proxy, mobile badge overlap).

**Iteration 2 ("city seeks visitor" rework, current):**
- Backend: new `/api/config`, `/api/me/profile`, `/api/me/discoveries` endpoints; POI extended with `opening_line` (per-language dict) + `interest_tags`; user extended with `interests`, `language`, `onboarded`, `notifications_enabled`. Schema migration auto-runs on startup. 39 pytest cases passing.
- Frontend: brand-new home (`ListenPage` + `ListeningCompass` + `WhisperCard`); 3-step `OnboardingPage` (language → interests with 3-to-5 gate → notifications); replaced favorites/visits with `DiscoveriesPage`; new `ProfilePage`. Old map flow removed from visitor nav.
- Web Audio API chimes per zone; Web Vibration API patterns per zone; Notifications API + service worker for background calls.
- Admin POIForm now takes `interest_tags` chips and per-language `opening_line` inputs.
- Multilingual UI strings (en/it complete, others fall back to English).
- Critical render-loop bug surfaced by testing agent and fixed: `useCityWhispers` now uses `onFoundRef`/`languageRef`/`notifRef` and a content-aware `setSightings` updater.
- Geo-fallback string and listen controls polished after iter-3 design review.

## Test Credentials
- **Admin**: admin@brera.app / BreraAdmin2026!
- Test users created on the fly with `TEST_<uuid>@example.com` / `Sekret123!`.

## Backlog
- **P1** — Translate Spanish, German, Greek, French, Portuguese UI copy + opening lines per POI (admin can already edit, just needs the strings).
- **P1** — Manifest.json + installable PWA so the app can run with screen off and background notifications fully (currently only when tab is open or browser keeps SW alive).
- **P2** — Public per-POI `/place/<slug>` pages for SEO + social cards.
- **P2** — Multi-area selector (Brera, Navigli, Isola, …); admin can pick the active area.
- **P3** — Native wearable bridge (Capacitor for Apple Watch / Wear OS / smart glasses with vibration + voice cues).
- **P3** — "Discovery score" + shareable visit map after each walk for word-of-mouth growth.
- **Carry-over** — Refactor `server.py` (>900 lines) into routers/auth.py, routers/pois.py, routers/me.py, seeds.py.

## Decision Log
- Map-first → Listening-first home (iter 2).
- No spoken voice; text + chime + vibration only (iter 2).
- Admin-editable per-language opening lines (iter 2).
- Brute-force lockout keyed by email only (iter 1) — proxy-IP rotation made the (ip+email) key unreachable.
- Cookie-based JWT (httpOnly, samesite=none) so the cross-site preview works.
