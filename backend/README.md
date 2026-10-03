# Aangan backend

FastAPI + SQLAlchemy 2.0 (async) + SQLite. Layers: `routers` (HTTP only) → `services`
(business logic) → `models`.

## Run backend locally

Prerequisites: [uv](https://docs.astral.sh/uv/). Supabase is used for Auth only.

```bash
cd backend
uv sync                      # installs Python 3.12 + dependencies into .venv
cp .env.example .env         # then fill in DATABASE_URL, SUPABASE_*, etc.
uv run alembic upgrade head  # apply migrations
uv run uvicorn app.main:app --reload --port 8000
```

Check it: `curl localhost:8000/v1/health` → `{"status":"ok","db":true}`
(`"db":false` means the app is up but cannot open the SQLite file). Interactive docs are at
`http://localhost:8000/docs`.

### Wire the Next.js UI (local)

1. Seed demo data (see below), then start the API as above.
2. In `backend/.env`, set `ENV=local` and `LOCAL_DEV_AUTH_EMAIL=demo@aangan.app` so read
   endpoints work without a Supabase JWT (dev only).
3. Set `FRONTEND_ORIGIN` to the exact URL Next.js prints (e.g. `http://localhost:3000` or
   `http://localhost:3001` if 3000 is busy).
4. In `frontend/.env.local`, set `NEXT_PUBLIC_API_URL=http://localhost:8000` and restart
   `npm run dev`.

By default the UI uses bundled JSON (`NEXT_PUBLIC_DATA_SOURCE=static` in
`frontend/.env.example`). Set `NEXT_PUBLIC_DATA_SOURCE=api` to load Home, Events,
Amenities, and Announcements from `GET /v1/home`, `/v1/events`, etc. Use `?state=empty`
on Home for an empty-state preview.

`DATABASE_URL` must use the `sqlite+aiosqlite://` scheme. The default local file is
`backend/.demo/aangan.db`.

### Tests

Tests use a separate SQLite file whose name contains `_test` (the suite refuses to run
otherwise). The default is `sqlite+aiosqlite:///./.demo/aangan_test.db`.

```bash
uv run pytest                # migrates the test DB, then runs each test in a rolled-back transaction
```

### Lint

```bash
uv run ruff check . && uv run ruff format --check .
```

### Migrations

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

Never edit a migration that has been applied; add a new one instead.

### Demo seed data

After migrations, load the Sector 50 demo society (identity, amenities, groups, posts,
events, tickets, stalls). Idempotent — safe to re-run:

```bash
cd backend
PYTHONPATH=. uv run python scripts/seed.py
```

Society bootstrap code (legacy): `AANGAN50`.

**Guest demo codes** for **Prestige Meridian Park** (one use each, any Google account) — from
`scripts/seed.py`:

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

Re-run `seed.py` to reset consumed guest codes before the next demo session.

**Master demo code (reusable, any Google account, never consumed):** `LIVING-OPEN-50`  
Override via env `MASTER_INVITE_CODE` (empty string disables).

Redeem via the app (`/join`) or `POST /v1/invites/redeem` with a Supabase access token.
