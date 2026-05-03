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

## Test Credentials
- **Admin**: admin@brera.app / BreraAdmin2026!
- Test users: `TEST_<uuid>@example.com` / `Sekret123!`
- **Contributor**: register via `/register?role=contributor` UI or `POST /api/auth/register` with `as_contributor:true`

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
