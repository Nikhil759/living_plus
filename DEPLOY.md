# Deploy Living+

## Vercel (frontend)

1. Import [github.com/Nikhil759/living_plus](https://github.com/Nikhil759/living_plus) in Vercel.
2. Set **Root Directory** to `frontend`.
3. Environment variables (Production) — see `frontend/.env.example`:
   - **Required for auth:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`NEXT_PUBLIC_DATA_SOURCE=api`** and **`NEXT_PUBLIC_API_URL=https://<your-railway-host>`** — required for invite join, real profile name, and home feed (not `localhost`).
   - `static` keeps demo JSON and skips strict join routing; use only for UI-only demos.
4. In Supabase → Authentication → URL configuration, add your Vercel site plus `/auth/callback` and `/auth/reset`.
5. Deploy. The default build command is `next build` inside `frontend`.

CLI from repo root:

```bash
npx vercel --cwd frontend --prod
```

## Railway (backend)

1. Create a project and add a service from this repo with **Root Directory** `backend`.
2. Railway picks up `backend/railway.toml` and the `Dockerfile` (migrations run on start).
3. Required variables:
   - `ENV=production`
   - `DATABASE_URL` — **SQLite only** today, e.g. `sqlite+aiosqlite:////data/aangan.db`. Mount a Railway **volume** at `/data` so the file survives redeploys (ephemeral disk otherwise resets on every deploy).
   - `SUPABASE_URL` — `https://<ref>.supabase.co` (must match the frontend Supabase project)
   - `FRONTEND_ORIGIN` — exact Vercel origin(s), comma-separated if needed, e.g. `https://living-plus-two.vercel.app` (no trailing slash). Used for browser CORS on amenity booking widgets.
   - `REDIS_URL` — e.g. `redis://localhost:6379/0` (required by config; rate limiting not wired yet)
4. Vercel `NEXT_PUBLIC_API_URL` must be the Railway **root** host only, e.g. `https://your-service.up.railway.app` — not `/v1` and not `localhost`.
5. Do **not** set `LOCAL_DEV_AUTH_EMAIL` in production.
6. **Seed data:** each container start runs `scripts/seed.py` after migrations (idempotent). You only need a manual seed if you skip the Docker entrypoint or use a custom command.

CLI (after `railway login` and `railway link` from `backend/`):

```bash
cd backend && railway up
```

## Smoke checks

- Frontend: open `/` → login for new visitors; members land on `/home`.
- API: `GET https://<railway-host>/v1/health` → `{"status":"ok","db":true}`.
