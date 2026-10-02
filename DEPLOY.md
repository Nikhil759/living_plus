# Deploy Living+

## Vercel (frontend)

1. Import [github.com/Nikhil759/living_plus](https://github.com/Nikhil759/living_plus) in Vercel.
2. Set **Root Directory** to `frontend`.
3. Environment variables (Production):
   - `NEXT_PUBLIC_DATA_SOURCE=static` — bundled demo JSON (no API required).
   - Optional: `NEXT_PUBLIC_DATA_SOURCE=api` and `NEXT_PUBLIC_API_URL=https://<your-railway-host>` once the API is live and CORS is set.
4. Deploy. The default build command is `next build` inside `frontend`.

CLI from repo root:

```bash
npx vercel --cwd frontend --prod
```

## Railway (backend)

1. Create a project and add a service from this repo with **Root Directory** `backend`.
2. Railway picks up `backend/railway.toml` and the `Dockerfile` (migrations run on start).
3. Required variables:
   - `ENV=production`
   - `DATABASE_URL` — `postgresql+asyncpg://…` (Supabase **pooler**, port 6543, for IPv4).
   - `SUPABASE_URL` — `https://<ref>.supabase.co`
   - `FRONTEND_ORIGIN` — exact Vercel URL, e.g. `https://living-plus.vercel.app` (no trailing slash)
   - `REDIS_URL` — Upstash `rediss://…` or a placeholder if unused yet
4. Do **not** set `LOCAL_DEV_AUTH_EMAIL` in production.
5. After first deploy, run seed once (Railway shell or local against prod DB):

   ```bash
   cd backend && PYTHONPATH=. uv run python scripts/seed.py
   ```

CLI (after `railway login` and `railway link` from `backend/`):

```bash
cd backend && railway up
```

## Smoke checks

- Frontend: open `/` → login for new visitors; members land on `/home`.
- API: `GET https://<railway-host>/v1/health` → `{"status":"ok","db":true}`.
