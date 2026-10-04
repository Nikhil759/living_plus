# Aangan

Community app for Indian gated housing societies. Residents join interest groups, find WhatsApp groups, host free/paid/society events (with food stalls), book amenities, raise help-desk tickets, use a marketplace, and ask an AI concierge. Committee members approve events, stalls, members, and agent actions.

## Repository layout

| Path | Description |
|------|-------------|
| [`frontend/`](frontend/) | Next.js 15 (React 19, Tailwind). UI can run on bundled mock data or against the API. |
| [`backend/`](backend/) | FastAPI, SQLAlchemy 2.0 async, SQLite, Supabase Auth. See [backend/README.md](backend/README.md) for API-specific details. |

## Saarthi (AI guide)

**Saarthi eval: 98%** (49/50 cases, safety 100%, 4 Oct 2026). [Latest report](backend/evals/reports/2026-10-04.md).

50+ cases in [`backend/evals/cases.yaml`](backend/evals/cases.yaml) cover guide answers with citations, live data, actions, Fill with Saarthi and safety. Run them against the real model (needs `GEMINI_API_KEY`):

```bash
cd backend && uv run python -m evals.run
```

The runner builds a fresh seeded database, writes a dated report to `backend/evals/reports/`, and fails below 85% overall or 100% on safety. CI runs it when the AI layer changes, using the `GEMINI_API_KEY` repository secret.

## Prerequisites

- **Frontend:** Node.js 18+ and npm
- **Backend (optional for UI-only dev):** [uv](https://docs.astral.sh/uv/), Redis (optional for rate limits; defaults to `redis://localhost:6379/0`)
- **Auth (login / join):** A [Supabase](https://supabase.com) project with email/password and/or Google OAuth

## Quick start — frontend only (mock data)

Fastest way to explore the UI without Postgres or the API.

```bash
cd frontend
npm install
cp .env.example .env.local
```

In `frontend/.env.local`, keep the defaults:

- `NEXT_PUBLIC_DATA_SOURCE=static` — reads from bundled JSON and a local SQLite demo store
- `NEXT_PUBLIC_API_URL=http://localhost:8000` — unused in static mode

For **login and join**, add your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Start the dev server from the repo root or from `frontend/`:

```bash
# from repo root
npm install          # once, installs root scripts only
npm run dev

# or from frontend/
npm run dev
```

Open the URL Next.js prints (usually [http://localhost:3000](http://localhost:3000)).

**Demo SQLite (optional):** With `DATA_SOURCE=static`, a writable demo DB under `frontend/.demo/demo.db` is enabled by default for local CRUD. Seed it:

```bash
cd frontend
npm run demo:seed
```

Set `DEMO_LOCAL_STORE=0` in `.env.local` to use JSON imports only (no SQLite). See comments in [`frontend/.env.example`](frontend/.env.example).

Without Supabase env vars, the login page loads but sign-in is not configured (`supabaseConfigured={false}`).

## Full stack — frontend + API

Use this when the UI should load and write through FastAPI (`GET /v1/*`) and `backend/.demo/aangan.db`.

### 1. Backend

```bash
cd backend
uv sync
cp .env.example .env
# Edit .env: DATABASE_URL, SUPABASE_URL, FRONTEND_ORIGIN, REDIS_URL
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/v1/health
# {"status":"ok","db":true}
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

**Local dev auth (no JWT):** In `backend/.env`:

```env
ENV=local
LOCAL_DEV_AUTH_EMAIL=demo@aangan.app
```

After seeding (below), read endpoints work without a Bearer token when the frontend calls the API as this user.

**CORS:** Set `FRONTEND_ORIGIN` to the exact Next.js origin (e.g. `http://localhost:3000`), with no trailing slash.

`DATABASE_URL` must use the `sqlite+aiosqlite://` scheme (see `backend/.env.example`).

### 2. Seed demo data

```bash
cd backend
PYTHONPATH=. uv run python scripts/seed.py
```

Idempotent — safe to re-run. Loads the Sector 50 demo society (amenities, groups, events, tickets, etc.).

**Join codes (Prestige Meridian Park guests — one use each):**

| Code | Flat |
|------|------|
| `PMG-7H4K` | C-702 |
| `PMG-9R2N` | A-101 |
| `PMG-3W8P` | B-105 |
| `PMG-5K1M` | C-104 |
| `PMG-2L6T` | D-108 |
| `PMG-8V4C` | A-106 |
| `PMG-1D9X` | B-102 |
| `PMG-6F3Q` | D-101 |

**Reusable master demo code:** `LIVING-OPEN-50` (override with `MASTER_INVITE_CODE` in backend `.env`; empty string disables).

Redeem in the app at `/join` or via `POST /v1/invites/redeem` with a Supabase access token. Re-run `seed.py` to reset consumed guest codes.

Legacy society bootstrap code: `AANGAN50`.

### 3. Frontend wired to API

In `frontend/.env.local`:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Restart `npm run dev`. Home, Events, Amenities, and Announcements load from `/v1/home`, `/v1/events`, etc. Use `?state=empty` on Home for an empty-state preview.

## Environment variables

Copy from examples — never commit secrets.

| File | Purpose |
|------|---------|
| [`frontend/.env.example`](frontend/.env.example) | Supabase public keys, `NEXT_PUBLIC_DATA_SOURCE`, `NEXT_PUBLIC_API_URL`, demo SQLite toggles |
| [`backend/.env.example`](backend/.env.example) | Database, Supabase URL, CORS origin, Redis, test DB URL, local dev auth |

## App routes (high level)

| Route | Purpose |
|-------|---------|
| `/` | Redirects to login, join, or home based on session and membership |
| `/login` | Supabase sign-in |
| `/join` | Redeem society invite code |
| `/home` | Resident home feed |
| `/events`, `/amenities`, `/announcements` | Core society features |
| `/community`, `/marketplace`, `/help-desk`, `/ask-aangan` | Groups, listings, tickets, AI concierge |
| `/profile`, `/more` | Settings and navigation |

## Scripts

### Root (`package.json`)

| Command | Action |
|---------|--------|
| `npm run dev` | Start Next.js dev server (`frontend/`) |
| `npm run dev:clean` | Clear `.next` and start dev |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run typecheck` | TypeScript check |

### Frontend

| Command | Action |
|---------|--------|
| `npm run demo:seed` | Seed local SQLite demo DB from static JSON |
| `npm run demo:import-pg` | Seed demo DB and export via backend script |

### Backend

| Command | Action |
|---------|--------|
| `uv run pytest` | Tests (requires a SQLite file whose name contains `_test`) |
| `uv run ruff check .` | Lint |
| `uv run alembic upgrade head` | Apply migrations |
| `uv run alembic revision --autogenerate -m "..."` | New migration |

Pytest creates `backend/.demo/aangan_test.db` automatically. Details: [backend/README.md](backend/README.md).

## Tech stack

**Frontend:** Next.js 15, React 19, Tailwind CSS, Supabase Auth (SSR), optional local SQLite demo store.

**Backend:** Python 3.12, uv, FastAPI, Pydantic v2, SQLAlchemy 2.0 async + aiosqlite, Alembic, SQLite, Supabase Auth (JWT via JWKS), Redis, with planned integrations for background jobs (arq), agents (LangGraph), payments (Razorpay), email (Resend), and WhatsApp (Twilio).

## Contributing

- Backend changes: run `uv run ruff check` and `uv run pytest` from `backend/` before opening a PR.
- Frontend: run `npm run typecheck` from `frontend/` or the repo root.
- Every schema change needs a new Alembic migration; do not edit applied migrations.

## License

Private — see repository settings for distribution terms.
