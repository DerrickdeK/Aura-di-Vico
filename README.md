# Aura — a city that whispers

> *"The whole idea was for the places to seek the visitor, not the other way around.
> I wanted a first where the city is actually talking to you."*

**Aura** is a whisper-first walking companion for any city, town, or
campus. It runs as a mobile-web progressive app (PWA). As you walk,
invisible points of interest *sense* you from 200 m away, *call* your
name from 80 m, and *reveal* their full story when you reach them —
through haptic buzzes, soft chimes, and first-person voice in your
preferred language. Open an AI dialogue with any place, send a walk
to a friend as a gift with a beautiful unfurl preview, or
deploy the whole template for your own city in a single JSON file.

The current default deployment is **Vico Equense** on the Sorrento
coast. The same codebase also serves **Brera / Milano** and
**Oltrarno / Florence** via the multi-tenant engine
(`?tenant=<slug>`), and is designed as a generic template: drop in
your own `area.config.json` and you have a new city.

---

## Licensing at a glance

This project is released under the **GNU Affero General Public License
v3.0 or later** (`AGPL-3.0-or-later`). See `LICENSE` for the full text
and `NOTICE` for the plain-language summary and commercial-license
option.

**TL;DR:** you are free to use, fork, host, and modify this software.
If you run a modified version as a public web service, you must publish
*your* source code under the same AGPL terms. This is by design: the
goal is a commons of city-talks-to-you apps, each one improving the
next.

If your use case requires a private, closed-source fork (e.g., a
proprietary tourism-platform integration), a separate **commercial
license** is available on request — see `NOTICE` for contact.

The **names** "Aura" and "Aura di Vico Equense" are trademarks-in-use
of the original authors. Forks must be renamed. `area.config.json`
makes this a two-minute operation.

---

## Quick start (for forkers)

```bash
# 1. Clone and install
git clone <your-fork-url> my-city-aura
cd my-city-aura

# 2. Backend
cd backend
cp .env.example .env        # fill in real values — see below
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn server:app --reload --port 8001

# 3. Frontend (new terminal)
cd ../frontend
cp .env.example .env        # point REACT_APP_BACKEND_URL at your backend
yarn install
yarn start                  # http://localhost:3000
```

### Required environment variables

**`backend/.env`** (never commit; `.env*` is in `.gitignore`):

```dotenv
MONGO_URL="mongodb://localhost:27017"
DB_NAME="aura_<yourcity>"
JWT_SECRET="<run: openssl rand -hex 32>"
ADMIN_EMAIL="admin@yourcity.app"
ADMIN_PASSWORD="ChangeThisNow123!"
FRONTEND_URL="http://localhost:3000"

# Optional — features degrade gracefully without them
RESEND_API_KEY=""                 # transactional email (password reset, moderation)
SENDER_EMAIL="Aura di <city> <onboarding@yourdomain.com>"
ANTHROPIC_API_KEY=""              # AI POI dialogue + Clone-to-new-city wizard
EMERGENT_LLM_KEY=""               # alternative to Anthropic; do not hardcode
DEFAULT_TENANT_SLUG="your-city-slug"
AREA_CONFIG_PATH="/app/area.config.json"
```

**`frontend/.env`**:

```dotenv
REACT_APP_BACKEND_URL="http://localhost:8001"
WDS_SOCKET_PORT=3000
```

### Making it your city — the 2-minute operation

Open `area.config.json` at the repo root and replace:

1. `slug` — a URL-safe name for your city (`your-city-name`)
2. `brand`, `area`, `city`, `tagline` — bilingual (en/it minimum)
3. `map.center.{lat,lng}` — your town centre coordinates
4. `palette` — your brand colours as CSS variable values
5. `landmarks[]` — 3 to 8 well-known anchors with photos for the landing page
6. `pois[]` — 15 to 30 hidden points of interest the city should whisper about
7. `narrator.intro.{it,en}` — a ~300-word first-person monologue (the city
   introducing herself on first visit)

Run the backend. Visit `/`. That's it — a new city.

A Clone-to-New-City Wizard (`/admin/area`, requires admin login) can
draft most of the config for you via an LLM call; you then curate.

---

## Architecture

- **Backend:** FastAPI + Motor (async MongoDB) + JWT cookie auth
- **Frontend:** React 18 + Tailwind CSS + shadcn/ui + Framer Motion + Leaflet maps
- **AI:** Anthropic Claude (Sonnet 4.5 for POI dialogue, Haiku for moderation)
- **Email:** Resend (optional, graceful fallback to console logging)
- **PWA:** manifest + service worker, installable on iOS/Android
- **Web APIs:** Geolocation, Vibration (Android only — iOS limitation),
  Web Speech API for TTS, Notifications API for whispered prompts

The `/app/backend/routers/` package and `/app/backend/tenants.py`
together drive the multi-tenant engine. One deployment, many cities —
resolved per request from `X-Tenant-Slug` header, `?tenant=` query,
first DNS label, or env-var default.

---

## Contributing

Contributions are welcome — bug reports, new city configs, translations,
design improvements. Please open an issue or PR.

- All contributions must be AGPL-3.0 compatible.
- New city configs: add a `/configs/<slug>.json` following the
  `vico-equense.json` shape. Include verified coordinates, canonical
  facts (to anchor the AI against hallucinations), and bilingual
  opening lines at minimum.
- Code: follow the existing code style. Backend = ruff-clean;
  frontend = ESLint-clean. Add `data-testid` to every new interactive
  element — the end-to-end tests rely on them.

---

## Credits & acknowledgements

- The concept was prototyped and evolved on the [Emergent platform](https://emergent.sh).
- Maps by [OpenStreetMap](https://www.openstreetmap.org) contributors.
- Icons by [Lucide](https://lucide.dev).
- Typography: Liberation Serif / FreeSerif (bundled),
  Inter (Google Fonts).

---

## A note from the author

This project exists because I believe a city is richer than any
guidebook can show — that the anecdote beats the monument, and that
quiet places deserve the chance to speak first. If you fork it and
bring it to your own town, please send me a postcard (or a screenshot).
That's payment enough.

Made slowly, in Italy, with whispers.
