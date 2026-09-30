# Aangan backend

FastAPI + SQLAlchemy 2.0 (async) + Postgres. Layers: `routers` (HTTP only) → `services`
(business logic) → `models`.

## Run backend locally

Prerequisites: [uv](https://docs.astral.sh/uv/) and a Postgres 15+ database
(a Supabase project, or local Postgres).

```bash
cd backend
uv sync                      # installs Python 3.12 + dependencies into .venv
cp .env.example .env         # then fill in DATABASE_URL, SUPABASE_*, etc.
uv run alembic upgrade head  # apply migrations
uv run uvicorn app.main:app --reload --port 8000
```

Check it: `curl localhost:8000/v1/health` → `{"status":"ok","db":true}`
(`"db":false` means the app is up but cannot reach Postgres). Interactive docs are at
`http://localhost:8000/docs`.

`DATABASE_URL` must use the `postgresql+asyncpg://` scheme. Run migrations against
Supabase's direct connection (port 5432), not the pooled one.

### Tests

Tests need a separate Postgres database whose name ends in `_test` (the suite refuses to run
otherwise). Point `TEST_DATABASE_URL` at it; the default is
`postgresql+asyncpg://postgres:postgres@localhost:5432/aangan_test`.

```bash
createdb aangan_test         # once (or create it from the Supabase SQL editor / a local tool)
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
