# Aangan: Architecture

## Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router, TypeScript), Tailwind, shadcn/ui | Deployed on Vercel |
| API | FastAPI + Pydantic v2 | Validation and structured errors built in |
| Database | Postgres on Supabase, pgvector | App data and embeddings in one place |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic | Migrations required by the brief |
| Auth | Supabase Auth (email/password + Google); FastAPI verifies the JWT | Social login; authorisation stays in our API |
| Cache / rate limits | Redis (Upstash) | Rate limits, amenity status, repeated LLM answers |
| Jobs | arq worker | Reminders, digest, ticket release, document ingestion |
| Agents | LangGraph | Interrupts give human-in-the-loop approval |
| Tracing | Langfuse + our `llm_calls` table | Per-request traces, cost and latency dashboard |
| Integrations | Razorpay (+ webhooks), Resend, Twilio WhatsApp sandbox | 2+ integrations with retries and webhooks |
| Deploy | Railway/Render (API + worker), Vercel (frontend), GitHub Actions CI | |

## Request flow
1. App sends request with Supabase access token.
2. FastAPI verifies the token, loads the user's approved membership (society_id, role).
3. Router calls a service; the service always filters by the member's society_id.
4. Typed response, or `{code, message}` error.

AI requests follow the same path into LangGraph. **Agent tools wrap the same services**, run with the calling user's permissions, and never use raw SQL.

## Backend layout
```
backend/app/
  main.py
  core/          config, db, errors, logging, redis
  auth/          token verification, current_user, current_member, require_role
  models/        SQLAlchemy tables
  schemas/       Pydantic types
  routers/       societies, community, events, amenities, tickets,
                 marketplace, payments, notifications, assistant, admin, webhooks
  services/      business logic (shared by routers and agents)
  agents/        graph, supervisor, amenity, event, ops, connection, concierge, tools/
  rag/           ingest, chunking, retrieval
  integrations/  razorpay, resend, whatsapp
  workers/       arq jobs
backend/alembic/  migrations
backend/evals/    dataset + runner
backend/tests/
backend/scripts/seed.py
```

## Data model
Every table except `users` has `society_id`; every query filters on it.

**Identity**
- `users`: supabase_uid, email, phone, name, avatar_url
- `societies`: name, city, address, invite_code, plan, settings
- `towers`, `flats`
- `memberships`: user_id, society_id, flat_id, role (owner/tenant/landlord/committee/admin), status (pending/approved/rejected). Unique (user_id, society_id)
- `profiles`: bio, interests[], is_visible (default false), show_flat (default false)

**Community**
- `groups`, `group_members`
- `whatsapp_groups` (invite_link only returned after approved join request)
- `join_requests` (target_type group/whatsapp)
- `posts` (group_id null = society feed), `comments`, `reactions`

**Events and payments**
- `events`: type (free/paid/society), host_id, amenity_id, starts_at, ends_at, capacity, price (paise), status (draft/pending_approval/published/cancelled/completed)
- `event_tickets`: covers RSVPs and paid tickets; status reserved/confirmed/cancelled
- `stall_applications`: stall_type, fee, spot_no, status
- `payments`: purpose (ticket/stall), amount computed server-side, razorpay ids (unique), status
- `webhook_events`: event_id unique, for idempotency

**Amenities**
- `amenities`: type, capacity, open_hours, rules {slot_minutes, max_hours_per_week, advance_days, requires_approval}
- `amenity_bookings`: time_range tstzrange with EXCLUDE constraint (no overlaps)
- `amenity_status`: crowd_level, note

**Help desk**
- `tickets`: category, priority (filled by ops agent), status, duplicate_of, assigned_vendor_id
- `ticket_updates`: actor_type user/agent/committee
- `vendors`

**AI and system**
- `documents`, `document_chunks` (embedding vector, HNSW index)
- `chat_sessions`, `chat_messages` (citations jsonb)
- `agent_runs`, `approvals` (action_type, payload, status)
- `notifications` (priority critical/normal, channel)
- `llm_calls` (model, tokens, cost, latency, trace_id)
- `listings`, `audit_log`

**Key indexes:** society_id everywhere; (society_id, starts_at) on events; HNSW on chunk embeddings; exclusion constraint on bookings; unique Razorpay and webhook ids.

## Agents (LangGraph)
- **Supervisor:** small, fast model routes to a specialist (structured output).
- **Amenity agent:** availability, rules, booking.
- **Event agent:** plans events, picks venue and time, drafts, invites matching residents.
- **Ops agent:** triages new tickets, dedupes, suggests vendor.
- **Connection agent:** interest matching for people and groups.
- **Concierge:** RAG with citations (built last).
- **Approvals:** risky actions (see PRODUCT.md) create an `approvals` row and interrupt the graph; committee approve/reject resumes it.
- **Memory:** LangGraph Postgres checkpointer, one thread per chat session.
- **Models:** router model, main model, fallback model, all from config. Retry once, then fall back.
- **Safety:** user content and document text passed as data inside delimiters; tools validate arguments; an agent can never change its own society or role.

## Build order
1. Skeleton, identity, auth, seed, deploy + CI
2. Amenities
3. Community
4. Events + stalls
5. Razorpay payments + webhooks
6. Help desk
7. Notifications + worker
8. Agents
9. RAG concierge
10. Evals, rate limits, cost dashboard

Detailed task prompts: `docs/build-prompts.md`.
