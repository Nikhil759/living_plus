# Aangan

Community app for Indian gated housing societies. Residents join interest groups, find WhatsApp groups, host free/paid/society events (with food stalls), book amenities, raise help-desk tickets, use a marketplace, and ask an AI concierge. Committee members approve events, stalls, members and agent actions.

## Repo layout
- `/frontend`: Next.js, already built with mock data
- `/backend`: FastAPI, being built now

## Backend stack
Python 3.12, uv, FastAPI, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, Postgres on Supabase (pgvector enabled), Supabase Auth (email/password + Google) verified server-side, Redis (Upstash) for rate limits and cache, arq for background jobs, LangGraph for agents, Langfuse for tracing, Razorpay, Resend, Twilio WhatsApp sandbox.
Tests: pytest + pytest-asyncio + httpx AsyncClient. Lint: ruff.

## Rules
- Layers: routers (HTTP only) -> services (business logic) -> models. Agents call services, never raw SQL.
- Every table except `users` has `society_id`. Every service query filters by the current user's `society_id`. Never trust `society_id` from the request body.
- All request/response bodies are Pydantic schemas in `app/schemas`. Validate inputs strictly.
- Errors: raise `AppError(code, message, status)` and return `{"code", "message"}` JSON. No bare 500s with stack traces.
- Secrets only from environment via `app/core/config.py`. Never hardcode keys. Keep `.env.example` updated.
- Every schema change is an Alembic migration. Never edit an applied migration.
- Every endpoint gets tests: happy path, validation error, unauthorised, wrong-society access.
- Keep functions small and typed. No unused code. Short comments for non-obvious decisions.
- Do not modify files outside the scope of the current task.

## Workflow
- Before finishing any task: run `ruff check` and `pytest` from `/backend`, fix failures.
- Summarise what changed, then commit with a clear message. One commit per task; never squash history.
