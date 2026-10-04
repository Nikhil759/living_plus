FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app
COPY scripts ./scripts
COPY seed_data ./seed_data

ENV PATH="/app/.venv/bin:$PATH"

# Railway sets PORT; migrate, seed demo society (idempotent), then serve.
CMD ["sh", "-c", "alembic upgrade head && PYTHONPATH=. python scripts/seed.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
