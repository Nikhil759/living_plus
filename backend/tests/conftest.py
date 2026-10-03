import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import inspect
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.pool import NullPool

# Shared "world" fixture for the local business test files.
pytest_plugins = ["tests.business_world"]

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DB_PATH = BACKEND_DIR / ".demo" / "aangan_test.db"
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}",
)

# Tests roll back per test, but a mistaken URL must never touch a real database.
_db_name = Path(make_url(TEST_DATABASE_URL).database or "").name
if "_test" not in _db_name:
    raise pytest.UsageError("TEST_DATABASE_URL must point to a database whose name contains _test")

# Forced (not setdefault) so the app under test can only ever see the test database.
# This must happen before `app` is imported, because Settings is read at import time.
os.environ.update(
    ENV="test",
    DATABASE_URL=TEST_DATABASE_URL,
    SUPABASE_URL="https://test.supabase.co",
    FRONTEND_ORIGIN="http://localhost:3000",
    REDIS_URL="redis://localhost:6379/0",
    LOCAL_DEV_AUTH_EMAIL="",
    UPLOAD_DIR=str(BACKEND_DIR / ".demo" / "test_uploads"),
)

from app.core.db import build_engine, get_db  # noqa: E402
from app.main import app  # noqa: E402


def _wipe_rows(sync_conn) -> None:
    inspector = inspect(sync_conn)
    tables = [name for name in inspector.get_table_names() if name != "alembic_version"]
    sync_conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
    for table in tables:
        sync_conn.exec_driver_sql(f'DELETE FROM "{table}"')
    sync_conn.exec_driver_sql("PRAGMA foreign_keys=ON")


@pytest.fixture(scope="session")
def migrated_db() -> None:
    """Bring the test database to the latest Alembic revision once per run."""
    TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    for leftover in (TEST_DB_PATH, Path(f"{TEST_DB_PATH}-wal"), Path(f"{TEST_DB_PATH}-shm")):
        leftover.unlink(missing_ok=True)
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")


@pytest.fixture
async def db_session(migrated_db: None) -> AsyncIterator[AsyncSession]:
    """Fresh rows per test. SQLite cannot nest service commits as Postgres savepoints do."""
    engine = build_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as connection:
        await connection.run_sync(_wipe_rows)
    session = AsyncSession(engine, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()
        async with engine.begin() as connection:
            await connection.run_sync(_wipe_rows)
        await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db() -> AsyncSession:
        return db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()
