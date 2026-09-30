import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.pool import NullPool

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/aangan_test"
)

# Tests roll back per test, but a mistaken URL must never touch a real database.
if not (make_url(TEST_DATABASE_URL).database or "").endswith("_test"):
    raise pytest.UsageError("TEST_DATABASE_URL must point to a database whose name ends in _test")

# Forced (not setdefault) so the app under test can only ever see the test database.
# This must happen before `app` is imported, because Settings is read at import time.
os.environ.update(
    ENV="test",
    DATABASE_URL=TEST_DATABASE_URL,
    SUPABASE_URL="https://test.supabase.co",
    SUPABASE_JWT_SECRET="test-jwt-secret",
    FRONTEND_ORIGIN="http://localhost:3000",
    REDIS_URL="redis://localhost:6379/0",
)

from app.core.db import build_engine, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def migrated_db() -> None:
    """Bring the test database to the latest Alembic revision once per run."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")


@pytest.fixture
async def db_session(migrated_db: None) -> AsyncIterator[AsyncSession]:
    """Session inside an outer transaction that is rolled back after the test.

    join_transaction_mode="create_savepoint" turns the code's own commit() calls into
    savepoint releases, so tests can exercise services that commit and still leave no data.
    """
    engine = build_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.connect() as connection:
        outer = await connection.begin()
        session = AsyncSession(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await outer.rollback()
    await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db() -> AsyncSession:
        return db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()
