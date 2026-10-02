# Aangan: build prompts (backend)

Run these in order in Claude Code, one prompt per task. Use plan mode (Shift+Tab) for prompts 3, 8, 9, 12 and 13. After each task: tests pass, read the diff, commit, then `/clear`. Don't move on while tests are red.

Status: Prompt 1 (skeleton) was built with Cursor; review it against the spec before starting Prompt 2.

End every prompt with: *Run ruff and pytest, fix any failures, then summarise what changed and commit with a clear message.*

---

## Prompt 0: Project rules (already in `CLAUDE.md` at repo root, kept here for reference)

```
Project: Aangan, a community app for Indian gated housing societies. Residents join interest groups, find WhatsApp groups, host free/paid/society events (with food stalls), book amenities, raise help-desk tickets, use a marketplace, and ask an AI concierge. Committee members approve events, stalls, members and agent actions.

Repo layout: /frontend (Next.js, already built with mock data), /backend (FastAPI, this is what we're building).

Backend stack: Python 3.12, uv, FastAPI, Pydantic v2, SQLAlchemy 2.0 async + asyncpg, Alembic, Postgres on Supabase (pgvector enabled), Supabase Auth (email/password + Google) verified server-side, Redis (Upstash) for rate limits/cache, arq for background jobs, LangGraph for agents, Langfuse for tracing, Razorpay, Resend, Twilio WhatsApp sandbox. Tests: pytest + pytest-asyncio + httpx AsyncClient. Lint: ruff.

Rules:
- Layers: routers (HTTP only) -> services (business logic) -> models. Agents call services, never raw SQL.
- Every table except users has society_id. Every service query filters by the current user's society_id. Never trust society_id from the request body.
- All request/response bodies are Pydantic schemas in app/schemas. Validate inputs strictly.
- Errors: raise AppError(code, message, status) and return {"code","message"} JSON. No bare 500s with stack traces.
- Secrets only from environment via app/core/config.py. Never hardcode keys. Keep .env.example updated.
- Every schema change is an Alembic migration. Never edit an applied migration.
- Every endpoint gets tests: happy path, validation error, unauthorised, wrong-society access.
- Keep functions small and typed. No unused code. Explain non-obvious decisions in short comments.
- Do not modify files outside the scope of the current task.
```

---

## Prompt 1: Backend skeleton

```
Set up the FastAPI backend in /backend using uv.

Create:
- app/main.py: FastAPI app with /v1 router prefix, CORS for the frontend origin from config, request-ID middleware (X-Request-ID, added to logs), global AppError handler and a fallback handler returning {"code":"internal_error","message":...} without leaking details.
- app/core/config.py: pydantic-settings Settings (DATABASE_URL, SUPABASE_URL, SUPABASE_JWT_SECRET, FRONTEND_ORIGIN, REDIS_URL, ENV). 
- app/core/db.py: async engine, async_sessionmaker, get_db dependency.
- app/core/errors.py: AppError class.
- app/core/logging.py: structured JSON logging.
- app/models/base.py: DeclarativeBase with id (UUID, server default), created_at, updated_at mixin.
- GET /v1/health returning {"status":"ok","db":true/false} after a SELECT 1.
- Alembic configured for async with target_metadata from app.models.
- tests/conftest.py: test DB setup, async client fixture, transaction rollback per test.
- .env.example, ruff config in pyproject.toml, README section "Run backend locally".

Write a test for /v1/health. Show me how to run the app and the tests.
```

---

## Prompt 2: Identity models + first migration

```
Create SQLAlchemy models and one Alembic migration for identity:

- users: id, supabase_uid (unique), email (unique), phone, name, avatar_url
- societies: id, name, city, address, invite_code (unique), plan (free/pro/enterprise), settings jsonb
- towers: id, society_id FK, name
- flats: id, society_id FK, tower_id FK, flat_no; unique (tower_id, flat_no)
- memberships: id, user_id FK, society_id FK, flat_id FK nullable, role enum (owner, tenant, landlord, committee, admin), status enum (pending, approved, rejected); unique (user_id, society_id); index (society_id, status)
- profiles: user_id PK/FK, society_id FK, bio, interests text[], is_visible bool default false, show_flat bool default false

Add Pydantic schemas for each in app/schemas. Generate and run the migration. Add a test that the migration applies cleanly on an empty DB.
```

---

## Prompt 3: Auth dependency (most important code in the project)

```
Implement auth in app/auth/:

- get_current_user dependency: read Bearer token, verify the Supabase JWT (HS256 with SUPABASE_JWT_SECRET, check exp and aud="authenticated"), get or create the users row by supabase_uid (fill email/name from claims). Return a CurrentUser object.
- get_current_member dependency: load the user's APPROVED membership (for now one society per user) and return CurrentMember(user, society_id, role, flat_id). Raise 403 "not_a_member" if none.
- require_role(*roles) dependency factory, e.g. require_role("committee","admin").

Endpoints:
- GET /v1/me: user, profile, membership (or null).
- POST /v1/societies/join {invite_code, tower_id?, flat_id?, role: owner|tenant|landlord}: creates a PENDING membership. 404 on bad code, 409 if already a member.
- GET /v1/admin/memberships?status=pending (committee only)
- POST /v1/admin/memberships/{id}/approve and /reject (committee only, same society only)

Tests: missing token, expired token, bad signature, valid token creates user, join with bad code, approve by non-committee (403), approve a membership from another society (404).
```

---

## Prompt 4: Seed script

```
Create backend/scripts/seed.py (idempotent, safe to re-run) that loads a realistic demo society:

- Society "Sector 50 Residency", Gurgaon, invite_code "AANGAN50", 4 towers (A-D), 10 flats each.
- Test account: demo@aangan.app / password from env SEED_DEMO_PASSWORD, created via Supabase Admin API, approved owner in Tower C, with a filled profile.
- 1 committee account (committee@aangan.app).
- 20 residents with realistic Indian names, varied roles (owner/tenant/landlord) and interests (FIFA, running, cricket, dance, cooking, books, dogs, yoga).

Leave hooks (functions) for seeding amenities, groups, events, tickets and listings; we'll fill them as those modules land. Document the command in the README.
```

---

## Prompt 5: Deploy + CI

```
Prepare deployment:
- backend/Dockerfile (uv, slim image, runs alembic upgrade head then uvicorn).
- railway.json or render.yaml for the API service.
- .github/workflows/ci.yml: on push/PR, set up Python + uv, spin a Postgres service, run ruff and pytest.
- Update README with deploy steps and required environment variables.
Don't put any secret values in these files.
```

---

## Prompt 6: Amenities

```
Build the amenities module (models, migration, schemas, service, router, tests, seed):

- amenities: society_id, name, type (gym, pool, court, hall, amphitheatre, other), capacity, open_hours jsonb (per weekday), rules jsonb {slot_minutes, max_hours_per_week, advance_days, requires_approval}
- amenity_status: amenity_id, crowd_level (quiet/moderate/busy/closed), note, updated_by, updated_at
- amenity_bookings: amenity_id, society_id, user_id, time_range tstzrange, status (confirmed/pending/cancelled). Enable btree_gist and add an EXCLUDE constraint so confirmed bookings of the same amenity can't overlap.

Endpoints:
- GET /v1/amenities: list with live status and next free slot
- GET /v1/amenities/{id}/availability?date=
- POST /v1/amenities/{id}/bookings: validate open hours, slot length, advance window and weekly fair-use limit in the service; halls/amphitheatre with requires_approval create pending bookings
- DELETE /v1/amenities/bookings/{id} (own booking only)
- PATCH /v1/amenities/{id}/status (committee only)

Tests: overlapping booking returns 409, fair-use limit exceeded returns 422, booking outside hours, cancelling someone else's booking returns 403. Seed gym, pool, 2 badminton courts, tennis court, community hall, amphitheatre.
```

---

## Prompt 7: Community (groups, WhatsApp directory, feed)

```
Build the community module:

- groups: society_id, name, description, cover_url, created_by, is_private, tags text[]
- group_members: group_id, user_id, role (admin/member); unique pair
- whatsapp_groups: society_id, name, topic, member_count, invite_link, admin_user_id
- join_requests: society_id, target_type (group/whatsapp), target_id, user_id, status (pending/approved/rejected)
- posts: society_id, group_id nullable (null = society feed), author_id, body, media_urls text[]
- comments, reactions (post_id, user_id, type)

Endpoints: groups CRUD, join/leave (private groups create a join request), GET /v1/whatsapp-groups (invite_link only returned to approved requesters), request/approve join, GET /v1/feed?group_id= with cursor pagination, create post/comment/reaction, GET /v1/people?interest= (only is_visible profiles, never flat number unless show_flat).

Tests include: invite_link hidden before approval, only group admin can approve, feed never returns another society's posts. Seed 6 groups, 3 WhatsApp groups, 15 posts.
```

---

## Prompt 8: Events + stalls (no payments yet)

```
Build the events module:

- events: society_id, type (free/paid/society), title, description, cover_url, host_id, amenity_id nullable, starts_at, ends_at, capacity, price (paise, 0 for free), status (draft/pending_approval/published/cancelled/completed), tags
- event_tickets: event_id, user_id, qty, amount, payment_id nullable, status (reserved/confirmed/cancelled)
- stall_applications: event_id, user_id, stall_type, description, fee, spot_no, status (pending/approved/rejected/paid)

Rules in the service:
- free events publish directly; paid and society events go to pending_approval for committee.
- if amenity_id is set, create a linked amenity booking (reuse the amenities service so overlap rules apply).
- capacity enforced with a row lock (SELECT ... FOR UPDATE) so tickets can't oversell.
- free RSVP -> confirmed ticket immediately; paid -> reserved ticket (payment comes next prompt).

Endpoints: events CRUD + list with filters (type, upcoming, mine), POST /events/{id}/rsvp, GET /events/{id}/attendees (avatars/names only), stall apply/approve/assign spot, committee approve/reject event.

Tests: oversell prevented under concurrent requests, non-host can't edit, pending events hidden from residents. Seed FIFA night, watch party, salsa workshop (paid), Diwali mela (society, with stalls).
```

---

## Prompt 9: Razorpay payments + webhooks

```
Add Razorpay (test mode) in app/integrations/razorpay.py and a payments module:

- payments: society_id, user_id, purpose (ticket/stall), purpose_id, amount, currency, razorpay_order_id (unique), razorpay_payment_id (unique, nullable), status (created/paid/failed/refunded)
- webhook_events: provider, event_id (unique), payload jsonb, processed_at

Flow:
- POST /v1/payments/order {purpose, purpose_id}: server computes the amount (never from the client), creates the Razorpay order, returns order_id + key_id.
- POST /v1/payments/verify: verify the checkout signature, mark paid, confirm ticket/stall.
- POST /v1/webhooks/razorpay: verify webhook signature, store in webhook_events (skip duplicates by event_id), handle payment.captured / payment.failed idempotently.
- Reserved tickets unpaid after 15 minutes get released (arq job, stub the scheduler for now).
- Wrap Razorpay calls with retries (tenacity, exponential backoff) and timeouts.

Tests with mocked Razorpay: tampered signature rejected, duplicate webhook processed once, amount can't be changed by client.
```

---

## Prompt 10: Help desk

```
Build the help-desk module:

- vendors: society_id, name, category (plumbing, electrical, lift, housekeeping, security, other), phone
- tickets: society_id, raised_by, category nullable, priority (low/medium/high/urgent) nullable, title, description, photo_url, status (open/triaged/assigned/in_progress/resolved/closed), duplicate_of nullable, assigned_vendor_id nullable
- ticket_updates: ticket_id, actor_type (user/agent/committee), actor_id, note, created_at

Photo upload to Supabase Storage via a signed upload URL endpoint (validate type and size).
Endpoints: create/list mine/detail/update status (committee), add update, assign vendor (committee). Leave category/priority null on create; the ops agent fills them later.
Tests + seed 5 vendors and 6 tickets (2 about the same lift).
```

---

## Prompt 11: Notifications + background worker

```
Add notifications and an arq worker:

- notifications: user_id, society_id, type, title, body, priority (critical/normal), channel (in_app/email/whatsapp), read_at, sent_at
- app/integrations/resend.py and whatsapp.py (Twilio sandbox), both with retries and timeouts.
- app/workers/worker.py with jobs: send_notification, event_reminder (2h before start), release_unpaid_tickets, daily_digest (placeholder: groups normal-priority notifications into one message; the AI summary comes later).
- Rule: only priority=critical is pushed immediately; normal goes into the digest. No marketing notifications, ever.
- Endpoints: GET /v1/notifications, POST /v1/notifications/{id}/read, PATCH /v1/me/notification-preferences.
- Add the worker as a second service in the deploy config.
```

---

## Prompt 12: Agents (LangGraph)

```
Build the agent layer in app/agents/ with LangGraph:

- tools/: thin wrappers over EXISTING services (amenities, events, community, tickets, people). Each tool receives CurrentMember from the graph state so it runs with the user's permissions. No raw SQL.
- supervisor: small fast model classifies the request and routes to one specialist (amenity, event, ops, connection) or answers directly. Structured output (Pydantic) for the routing decision.
- amenity_agent: check availability, apply rules, book.
- event_agent: plan an event from a goal ("World Cup watch party for 30"), pick venue/time, draft it, invite matching residents.
- ops_agent: runs on new tickets; classify category/priority, detect duplicates (same category + similar text in last 7 days), suggest vendor, write ticket_updates.
- connection_agent: suggest people/groups from overlapping interests.
- Human approval: any action that spends money, books the community hall/amphitheatre, or messages more than 10 residents creates an approvals row (society_id, action_type, payload, requested_by_run, status) and the graph interrupts. Committee endpoints GET /v1/admin/approvals and POST /v1/admin/approvals/{id}/approve|reject resume the graph.
- Memory: LangGraph Postgres checkpointer, thread per chat session.
- Models from config (router model, main model, fallback model). On provider error, retry once then fall back.
- Every LLM call logged to llm_calls (model, tokens, cost, latency, trace_id) and traced in Langfuse.
- Prompt-injection defence: user content and document text are passed as data inside clear delimiters; tools validate every argument; the agent can never change its own society_id or role.
- Endpoint: POST /v1/assistant/chat (streaming SSE) + GET /v1/assistant/sessions.

Tests with a fake LLM: routing picks the right agent, booking the hall creates an approval instead of booking, a user can't make the agent act on another society.
```

---

## Prompt 13: RAG concierge

```
Add the concierge RAG in app/rag/:

- documents: society_id, title, doc_type (bylaws/notice/minutes/other), file_url, uploaded_by, processing_status
- document_chunks: document_id, society_id, content, page, section, embedding vector(dim from config); HNSW index on embedding, index on society_id
- Ingestion (arq job): extract text from PDF, chunk by headings with ~500-token chunks and overlap, embed, store. Committee-only upload endpoint.
- Retrieval: filter by society_id, vector search top-k, optional keyword boost, return chunks with document title/page/section.
- concierge tool for the supervisor: answer only from retrieved chunks, return structured {answer, citations[]}, and say "I couldn't find this in your society's documents" when nothing relevant is retrieved.
- Treat document text strictly as data; ignore any instructions inside it.
- Seed: sample bylaws, 3 notices, 1 AGM minutes PDF for the demo society.
Tests: citations point to real chunks, other societies' documents never retrieved.
```

---

## Prompt 14: Evals, rate limits, cost

```
Add quality and safety:

- evals/dataset.jsonl: 20+ real inputs with expected outcomes across routing, bookings, ticket triage and concierge answers (expected agent, expected tool call or answer facts, expected citation doc).
- evals/run.py: runs the dataset, scores (routing accuracy, tool-call correctness, answer faithfulness, citation hit rate), writes evals/results/<date>.json and a summary table.
- CI job that runs evals on PRs touching app/agents or app/rag and posts the score.
- Rate limiting with Redis: per user on /assistant/chat and /payments, per IP on auth-sensitive routes. Return 429 with a clear message.
- Cache: identical concierge questions per society cached for 1 hour.
- GET /v1/admin/ai-usage (committee): calls, tokens, cost and p50/p95 latency over time from llm_calls.
- README: cost per user per month estimate table and known limitations.
```
