# Brera Discover — Product Requirements Document

## Original Problem Statement
> "My project is to enable visitors of any designated urban area (in this case the sector of Brera in Milan) to discover little or unknown points of interest (POI) indicated on a geo-positioning referenced platform map thanks to a signal sent to their smartphone, watch, or glasses."

User refinements:
> "The whole - original - idea was for the POI to seek the visitor and not the other way around. I intended this to be a first where the city is actually 'talking' to you."
> "The more we can encourage dialogue the better."

## Architecture
- **Frontend**: React PWA (CRA + craco), framer-motion, react-router-dom 7, axios. Web Audio API (chimes), Vibration API (haptics), Web Speech API (TTS), Notifications API + service worker (background calls).
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt. Cookie-based JWT (httpOnly, samesite=none, secure=true). All routes under `/api`.
- **DB collections**: `users`, `pois`, `visits`, `discoveries`, `password_reset_tokens`, `login_attempts`. Unique/TTL indexes set on startup.
- **Auth**: register/login/logout/me/refresh/forgot/reset; pre-seeded admin; brute-force lockout keyed by email.
- **i18n**: 7 languages (en/it/es/de/el/fr/pt). en/it fully translated; the rest fall back to English copy with their native name in pickers.

## Personas
1. **Wanderer** — opens the app while walking Brera. Home is a quiet *Listening* canvas. POIs are invisible until they sense the visitor; vibration + chime + (optional) voice cue zones.
2. **Registered User** — same as wanderer + interest filter, language, opt-in background notifications, "Whispers collected" journal, and a profile they can edit.
3. **Curator / Admin** — adds, edits, deletes POIs; sets per-language `opening_line` (the city's whisper) + theme tags. Can wipe & re-seed for student exercises.

## Onboarding (6 steps · anonymous-mode skip)
1. **Language** (en · it · es · de · el · fr · pt).
2. **Identity** — *Anonymous* (skips step 3) or *Personal* (lets Brera tailor its voice).
3. **Personal** *(skipped if anonymous)* — status, gender (incl. *non-binary* and *prefer not to say*), profession (with free-text *Other*).
4. **Preferences** — 8 themes: *local legends, curios, art, history, architecture, sceneries, food, shopping*.
5. **Context** — *Going around* (alone / partner / family / friends-or-group / guide) + *Pace & accessibility* (walking freely / limited stamina / wheelchair / stroller / with assistant / prefer not to say).
6. **Format & Contribute** — multi-select response formats (writing / voice / image / AI dialogue) + willingness to contribute (identify / illustrate / narrate / create POI) + opt-in background notifications.

All chip groups allow zero selections (treated as "no preference"). Personal-mode fields all allow blank.

## Core Mechanics — "The City Talks"
- Three concentric proximity zones around each POI:
  - **Sensed** (≤200 m): anonymous tease ("Something is watching you, 140 m north-east"). Soft 520 Hz chime + gentle vibration `[60,80,60]`.
  - **Called** (≤80 m): name + opening line revealed. 660 Hz chime + `[80,60,80,60,120]`. **If user opted in to *voice*, the opening line is spoken aloud** in the chosen language via Web Speech API.
  - **Found** (≤25 m): full story drawer auto-opens. 880 Hz chime + `[400,80,400]`.
- **Continuous gradient haptic** (`useGradientHaptic`): re-issues `navigator.vibrate` every ~1.6 s with a pattern that smoothly tightens as distance shrinks, *independent* of the discrete zone signatures. Haptic stops outside ~4× the trigger radius. Restored from the original concept.
- **Theme filter**: only POIs whose `interest_tags` intersect the user's chosen themes are shown on the compass / can call them. Untagged POIs are visible to everyone.
- Listening compass: motes appear on a compass ring at each POI's bearing + distance-mapped placement; only POIs that have already sensed the visitor become visible.
- A built-in **Ghost-walk simulator** lets desktop users experience the whole flow without GPS.

## Implementation timeline
- **Iteration 1** — Initial map+auth+favorites+visits+admin MVP (23 backend tests).
- **Iteration 2** — "City seeks visitor" rework: Listening canvas, three-zone whispers, multilingual onboarding (5 themes), opt-in background notifications, admin per-language opening lines. Critical infinite render loop fixed via stable refs in `useCityWhispers`.
- **Iteration 3** — Code-review polish pass: `devWarn` log helper, `useMemo` AuthContext, animation constants, stable keys, ruff-clean Python.
- **Iteration 4** — Onboarding redesign: 6-step wizard with anonymous branching, taxonomy expanded from 5 interest tags to 8 themes (POIs auto-migrated and re-tagged), new user fields (relationship_mode/status/gender/profession/companions/accessibility/response_formats/contribution_interests), continuous gradient haptic restored, voice mode (TTS) added. Backend 50/50 tests passing.
- **Iteration 5** — Public landing page with anonymous "aura" dots; **Virtual Navigation** (3 modes: auto-walk / step-forward / drag-pin minimap) so users not in Milan can experience the app; **Student Contribution System** with open registration as `contributor` role, per-POI submissions (narrative / dialogue prompt / fun fact / photo URL), admin moderation queue, public approved-only feed surfaced inside POI drawer. Backend 68/68 tests passing.
- **Iteration 6 (current — Apr 30, 2026)** — **Italian-first UX** with IT/EN language switcher, full i18n coverage of landing/auth/nav/contribute/moderation chrome. Landing page redesigned: larger 560px map + 5 clickable landmark thumbnails (Accademia/Pinacoteca/Cusani/Orsini/La Scala) with **square photo map pins** via Wikimedia + wsrv.nl proxy; clicking either pin or thumbnail flies the map. **Pre-deploy readiness trio** added: (1) Resend email integration with bilingual HTML templates for password-reset + contribution-moderation, with graceful dev-mode logging when no API key; (2) co-admin seed via env vars (`CO_ADMIN_EMAIL` / `CO_ADMIN_PASSWORD`); (3) PWA manifest + 6 icon sizes (192 / 512 / maskable variants + apple-touch + favicon) auto-generated from Python/Pillow script. New `/forgot-password` + `/reset-password` pages. Fixed pre-existing datetime-timezone bug in reset-password endpoint.
- **Iteration 7 (Feb 2026)** — Two P0 quality fixes after first student field test:
  - **Smarter native TTS** (`/app/frontend/src/lib/speech.js`): voice-quality scoring, espeak/festival rejected, premium engines (Apple "Enhanced/Premium", Microsoft "Natural/Online", Google network voices) preferred, BCP-47 language tags (en-US/it-IT), iOS unlock-on-tap (`unlockSpeech()`), slower fallback rate when no premium voice is found.
  - **AI dialogue hardening** (`/app/backend/poi_chat.py`): added admin-curated `canonical_facts` field on POI model — these take precedence over crowd memory in the system prompt. Crowd contributions now capped at 8 entries × 240 chars each (was 30 verbatim). New "HIERARCHY OF TRUTH" persona rule: when memories contradict, the AI says *"some say… others say…"* rather than picking one. Verified end-to-end against Claude Sonnet 4.5: hostile fictional questions ("when did Frida Kahlo paint here?") now decline gracefully without inventing dates. Admin POI editor exposes a per-line canonical-facts textarea. Backend 81/81 tests passing (added `test_poi_chat_prompt.py` + iter6 integration suite).
- **Iteration 8 (Feb 2026)** — **Itineraries as Gifts** (P1) shipped end-to-end:
  - Authenticated user composes a 3–8 POI walk + personal dedication (max 1200 chars) at `/gift/new`. Sender pre-filled from `useAuth().user.name`; POI grid lets you tap to add with ordered numeric badges; submit returns a short URL-safe slug (8 chars from `secrets.token_urlsafe`).
  - Public `/gift/<slug>` page (no auth required) renders a serif-typographic hero ("Brera ti aspettava, [name].") + dedication card + numbered POI walk + "Begin walking" CTA → `/listen?virtual=1`. Optional native-TTS "Hear the welcome" button uses the new high-quality voice pipeline.
  - Recipient language locked to `gift.language` (sender's choice at creation), so an Italian gift always reads as Italian even if the recipient flips the global UI switch.
  - Backend: 4 endpoints (`POST /api/itineraries`, `GET /api/itineraries/{slug}`, `GET /api/me/itineraries`, `DELETE /api/itineraries/{id}`); validates 3–8 POI bounds, dedupes preserving order, rejects unknown POI ids, bumps `view_count` on each public read; unique slug index, owner-or-admin delete.
  - Frontend: landing-page CTA "Make this a gift →" surfaces the entry point for authed users.
  - **Open-Graph unfurl preview** (last polish before deploy): `GET /api/share/{slug}` returns OG/Twitter-tagged HTML + meta-refresh to `/gift/{slug}`; `GET /api/og-image/itineraries/{slug}.png` composes a personalised 1200×630 PNG at request time via Pillow ("Marco ha invitato Anna a camminare per Brera." in serif on a terracotta-accented cream card). The composer's "Copy link" now shares the `/api/share/<slug>` URL so WhatsApp / iMessage / Slack / email all render a beautiful preview card.
  - Tests: 10 itinerary cases + 5 share-card cases. Total backend 95/95 PASS. Frontend E2E green.

- **Iteration 9 (Feb 2026)** — **Templatisation: Option A (Minimum Viable)** — the codebase now ships as a reusable template for any city/campus. All Brera-specific data extracted into a single `/app/area.config.json` (brand, area/city labels, tagline, map center, palette CSS vars, 5 landing-page landmarks, 18 POI seed). Backend loader (`/app/backend/area_config.py`) with `load_area()`, `reload_area()`, `pois_seed()`, `landmarks_dict()`, `public_area()`; `GET /api/area` exposes the public subset (no POI leak). Frontend `AreaProvider` (`/app/frontend/src/lib/area.jsx`) fetches once on mount, applies palette as `:root` CSS variables, and pushes `{brand, area, city, tagline}` defaults into `t()` via `setAreaDefaults`. Every hardcoded "Brera"/"Milano" in `i18n.js` (53 hits) replaced with `{area}`/`{city}` placeholders auto-interpolated per language. LandingPage now reads landmarks from `/api/area`; AdminPage, ListenPage, VisitsPage, GiftComposerPage, GiftRecipientPage use `pickLocale` from the area context. Multi-city consumers swap the file or set `AREA_CONFIG_PATH` — zero code edits needed. 5 new pytest cases for the loader. **Total backend 100/100 PASS.** See `/app/TEMPLATE.md` for the forker's guide.

- **Iteration 10 (Feb 2026)** — **Templatisation: Option B (Polished Template)** — the preview pod was flipped live to Vico Equense (`/app/configs/vico-equense.json` — 5 landmarks incl. Santissima Annunziata, Castello Giusso, Pizza a Metro da Gigino, Scrajo Terme, Gelateria Gabriele + 18 hidden POIs across the Sorrento peninsula; terracotta palette retuned to coastal `#D06C3B`/deep-green `#1F4F5C`) to prove the template is city-agnostic. Then shipped the **admin Area Settings UI** at `/admin/area`:
  - **Backend**: `area_settings` Mongo collection with a single `_id="active"` doc that stores overrides. `public_area()` + `merged_area()` + `merged_landmarks_dict()` shallow-merge overrides on top of the JSON file at request time. 5 new admin endpoints: `GET/PATCH/DELETE /api/admin/area-settings`, `GET /api/admin/area-export` (downloads full effective config incl. POI seed), `POST /api/admin/area-import` (replaces overrides from an uploaded JSON).
  - **Frontend**: new `AdminAreaPage.jsx` (480 lines) with 4 tabs — (1) **Brand & Palette**: bilingual IT/EN editors for brand/area/city/tagline + 11 color pickers with live `:root` CSS-var preview; (2) **Map & Center**: click-to-place Leaflet widget with lat/lng/zoom inputs; (3) **Landmarks**: full 3–8 landmark CRUD with per-landmark IT/EN name/note/intro/voice/coords/image; (4) **Import / Export**: one-click download of the current effective `area-config.json` + upload to replace overrides. Save / Reset / POIs-nav buttons in a sticky header. `/admin` page now surfaces an **Area settings** link.
  - **Template fork workflow**: Admin edits Area Settings live → saves → exports the merged JSON → the forker commits that file to the new city's fork at `/app/area.config.json`. One JSON per city, one Mongo per deployment. Zero code forks.
  - Tests: 10 new `test_admin_area_settings.py` cases (admin gating, shallow-merge, landmark-chat persona override, export/import round-trip). **Total backend 108/110 PASS** (2 Brera-specific skipped when AREA_CONFIG_PATH points at Vico). Frontend Playwright: all 4 tabs mount, save flow works, landmark CRUD works, export downloads the JSON.

- **Iteration 11 (Feb 2026)** — **Clone-to-New-City Wizard** (option e from the earlier Option B menu, shipped as a follow-up) — admins can now bootstrap a new city's `area.config.json` with one click + a city name:
  - **Backend**: `/app/backend/area_clone.py` — Claude Sonnet 4.5 via Emergent LLM key. Strict JSON-only prompt returns `{slug, brand, area, city, tagline, map, palette, landmarks[4]}` — intentionally omits POIs (those are added later via the existing POI admin CRUD) to keep each call under the 60-second ingress timeout. Helper `_extract_json` tolerates markdown fences; `_slugify` guarantees a URL-safe slug even when the model returns Unicode. New endpoint `POST /api/admin/area-clone` (admin-gated; Pydantic validates `city_name ≥ 2 chars`, optional `country` + `vibe` hints). Returns the draft JSON only — the admin reviews before persisting.
  - **Frontend**: new `CloneWizardModal` on `/admin/area` (purple-tint terracotta button in the header). Modal takes city name + optional country + optional vibe hint → "Draft with Claude" → shows a live preview card (brand, tagline, 11-swatch palette, landmark count, map centre). Two actions: **Download JSON** (for the forker to paste into `/app/area.config.json`) or **Apply as overrides** (imports into the `area_settings` collection, reversible via the Reset button). 
  - Tests: 11 unit tests in `test_area_clone.py` for slug normalisation + JSON extraction + prompt building. Live endpoint gating verified via curl (401 anon, 422 bad input). **Total backend 119/121 PASS** (2 Brera-only skipped under Vico Equense; 0 regressions).
  - ⚠️ **Emergent LLM key budget hit its cap** ($1.0129 spent of $1.00) during testing. Admin needs to top up via **Profile → Universal Key → Add Balance** (or enable auto-top-up) before the live wizard will produce drafts. Every other part of the app keeps working — only `/api/admin/area-clone` is affected.

## Test Credentials
- **Admin**: admin@brera.app / BreraAdmin2026!
- Test users: `TEST_<uuid>@example.com` / `Sekret123!`
- **Contributor**: register via `/register?role=contributor` UI or `POST /api/auth/register` with `as_contributor:true`

## Changelog

- **Iteration 12 (Feb 2026)** — **Phases 1–4 shipped in one pass** (145/147 pytest PASS, 0 regressions):
  - **Phase 1 — Router refactor (foothold):** New `/app/backend/routers/` package + `/app/backend/deps.py` with shared `db` / `get_current_user` / `require_admin`. New features now live as clean router modules; `server.py` stays untouched (zero regression risk). Full migration of legacy endpoints remains backlog.
  - **Phase 2 — Admin gift-stats dashboard:** `GET /api/admin/gift-stats` returns `{total_gifts, total_views, last_30_days[30], top_senders[≤5], recent_gifts[≤5]}` via Mongo aggregation. Frontend `GiftStatsCard` on `/admin` with inline-SVG sparkline (no recharts) + top-senders chips. Live stats: 68 gifts, 40 views.
  - **Phase 3 — First-class image uploads** (Emergent Object Storage): `POST /api/uploads/image` (authenticated, JPEG/PNG/WebP, ≤5 MB, returns `{id, url, size, content_type}`), `GET /api/uploads/{id}` (public, with `Cache-Control: immutable`), `GET /api/me/uploads`. Contribution form's `photo_url` type now shows a file picker → uploads → auto-fills the content field + shows an image preview. Paste-URL still works for backward compatibility. Validation: 415 on bad mimetype, 413 on oversize, 401 on anon.
  - **Phase 4 — Multi-tenant (Option C):** One deployment, many cities. `/app/backend/tenants.py` resolves the active tenant from `X-Tenant-Slug` header → `?tenant=X` query param → first DNS label → `DEFAULT_TENANT_SLUG` env → `area.config.json` slug. `area_config.py` gains `load_area_for(slug)` / `public_area(slug)` / `merged_area(overrides, slug)`. `GET /api/area`, `/api/admin/area-settings[*]`, `/api/admin/area-export`, `/api/admin/area-import`, `/api/landmarks/{id}/chat` all tenant-aware. Overrides collection keyed by `_id="active:{slug}"` (tenant isolation). New `GET /api/tenant` → `{active, available, area}` + `GET /api/tenant/{slug}/area`. Currently serving **Vico Equense** (default) AND **Brera** (via `?tenant=brera-milano`) from the same pod.
  - 26+ new tests (`test_iter10_phases.py`, `test_tenants.py`). Testing-agent auto-fixed a wrong-import compile-blocker in `GiftStatsCard.jsx` (`../lib/api` → `../../lib/api`).
  - Cosmetic: updated the photo_url i18n hint (EN + IT) now that uploads are live.

- **Iteration 13 (Feb 2026)** — **Vico Equense pivot** (pre-mayor-demo cleanup, 153/155 pytest PASS):
  - **Default tenant flipped** from `brera-milano` → `vico-equense`. `/app/area.config.json` seed replaced with the Vico config; the old Brera JSON preserved at `/app/configs/brera-milano.json` so `?tenant=brera-milano` still serves the original Milan experience (reversible, zero data loss).
  - **`tenants.py`** — `default_tenant()` falls back to `vico-equense`; `available_tenants()` now enumerates `/app/configs/*.json` + the active default-seed slug (no hardcoded Brera). **`area_config.py`** — `_tenant_path(slug)` maps any slug matching the currently-loaded default to `/app/area.config.json` (decoupled from Brera).
  - **`.env`** — `DEFAULT_TENANT_SLUG="vico-equense"`, `SENDER_EMAIL="Aura di Vico Equense <onboarding@resend.dev>"`, Anthropic API key rotated and re-wired.
  - **Area-aware copy**: `mailer.py` (subject + footer + "…joins the ones {area} will tell…"), `share_card.py` (OG headline + eyebrow + site_name + footer), `safety.py` (system prompt) all now pull `brand/area/city` from the active area config instead of hardcoding "Brera" / "Milano". OG cards now render `"Marco ha invitato Anna a camminare per Vico Equense"`.
  - **Frontend**: `public/index.html` (title, meta description, apple-web-app-title), `public/manifest.json` (name + short_name + description), `public/service-worker.js` (notification fallback) all re-branded Vico. `lib/i18n.js` landing eyebrow is now `{city} · {tagline}` (auto-pulls "LA CITTÀ A PICCO SUL MARE" from area config) instead of the hardcoded "bohemian quarter". `status.citizen` changed from "Citizen of Milan" → "Local resident" / "Residente locale". `POICoordPicker` search placeholder de-Milano'd.
  - **Tests updated**: `test_area_config.py` now asserts Vico defaults + Vico landmark ids. Added 8 new Vico-specific regression tests (153 total passing, 0 regressions, same 2 pre-existing Brera-only skips).
  - Security: last-session's Anthropic key exposed in chat was rotated; successor key wired at `ANTHROPIC_API_KEY`. Follow-up: rotate again after demo + set per-key monthly cap in Anthropic Console.

- **Iteration 14 (Feb 2026)** — **City-as-narrator intro monologue** (P0 carryover for any city, demoed on Vico Equense, 157/159 pytest PASS):
  - **Content**: ~300-word first-person monologue (IT + EN, ~2 min spoken) embedded under `narrator.intro.{it,en}` in `/app/area.config.json`. Touches Tyrrhenian winds (1320 bells), 1732 earthquake, Angevin castle + 19 Giusso generations, Silius Italicus (AD 101), Caruso at Scrajo (1895), Gigino's pizza-a-metro (1960), Sophia Loren's 2-metre Margherita (1972), Gabriele's delizia al limone (1978), the Norman watchtower, the 24-column cloister, bitter-orange garden, 1943 bunker. Ends: *"Non li devi cercare. Cammina. Saranno loro a sfiorarti il polso quando ci passerai vicino. Io sono qui. E ti parlo."*
  - **Backend**: `area_config.public_area()` surfaces `narrator`; `merged_area()` deep-merges `narrator.intro` so admins can override one language at a time without wiping the other. 4 new pytest cases in `test_narrator.py`.
  - **Frontend**: new `/app/frontend/src/components/CityNarrator.jsx` — a serif-typographic bottom-sheet/modal that auto-opens 600ms after `/api/area` resolves, only on the first visit per tenant (per-device localStorage key `aura-narrator-heard:{slug}`). Three controls: **Ascolta la sua voce** (uses the existing quality-aware `speak()` pipeline with `onEnd` callback → button flips to "Ferma l'ascolto"), **Continua in silenzio** (dismisses + writes localStorage), close (X). Terracotta accent bar on the left edge, framer-motion slide-up animation. Mounted once on `LandingPage`; gracefully hides when a tenant has no narrator configured (e.g., current Brera override).
  - `speech.js` extended with `onEnd` / `onError` callbacks on `speak()`.
  - New i18n block `narrator.{eyebrow, hear, stop, skip, next}` in both IT and EN.
  - Testing agent (iter12): verified fresh-visit auto-open, Hear/Stop/Skip/Close all work, localStorage gates the replay correctly, language swap re-renders body, landing page remains intact underneath, Brera tenant gracefully omits the narrator.

## Backlog
- **P0** — Wire the *Brera-as-narrator* intro story (700-word monologue I drafted) right after the language pick on first run; English & Italian written; other 5 languages fallback to English until students translate.
- **P1** — AI-supported dialogue per POI (`response_formats.dialogue`): each POI becomes a character via Emergent LLM key (Claude/GPT) with a per-POI system prompt; seeded by approved `dialogue_prompt` contributions.
- **P1** — Translate UI strings + opening lines + intro into Spanish/German/Greek/French/Portuguese.
- **P1** — Manifest.json + installable PWA icon, full background notification flow on iOS/Android.
- **P2** — Photo upload pipeline (currently photo URLs only — switch to S3/local persistent storage + thumbnail generation).
- **P2** — Public per-POI `/place/<slug>` pages, social cards, and shareable visit map.
- **P2** — Multi-area selector (Brera + Navigli + Isola, etc.) — admin can pick the active area and reuse the codebase as a template per city.
- **P3** — Native wearable bridge (Capacitor for Apple Watch / Wear OS / smart glasses).
- **Carry-over** — Refactor `server.py` (~1300 lines now) into routers/auth.py, routers/pois.py, routers/me.py, routers/admin.py, routers/contributions.py, seeds.py.

## Brera-as-Narrator (in memory, ready to wire)
Approximately 700 words / ~4 minutes spoken. Voice: first person, slightly mythic, conversational. Begins *"They've given me many names over the centuries — Braida, Brayda, Brera..."* and ends *"I am a quarter of a city. A field. A school. A canvas. A drinking glass. A memory. Walk slowly. Listen. Begin."* Stored in chat history; will be added to a content file when the intro experience ships.

## Decision Log
- Listening-first home (iter 2).
- Admin-editable per-language opening lines (iter 2).
- Email-only brute-force lockout key (iter 1).
- Cookie-based JWT, samesite=none, secure=true (iter 1).
- 8-theme taxonomy + auto-migration (iter 4) — replaces the original 5 interest tags.
- Continuous gradient haptic + 3 discrete zone signatures co-existing (iter 4) — best of both worlds.
- Voice TTS via Web Speech API rather than per-POI recordings for v1 (iter 4) — recordings remain available later through the *narrate* contribution flow.
