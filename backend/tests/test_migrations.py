import asyncio
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import pool, text

from app.core.db import build_engine

BACKEND_DIR = Path(__file__).resolve().parent.parent

IDENTITY_TABLES = frozenset({"users", "societies", "towers", "flats", "memberships", "profiles"})


def _alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["configure_logger"] = False
    return config


def _reset_public_schema(database_url: str) -> None:
    async def _run() -> None:
        engine = build_engine(database_url, poolclass=pool.NullPool)
        try:
            async with engine.connect() as conn:
                await conn.execute(text("DROP SCHEMA public CASCADE"))
                await conn.execute(text("CREATE SCHEMA public"))
                await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                await conn.commit()
        finally:
            await engine.dispose()

    asyncio.run(_run())


def _list_public_tables(database_url: str) -> set[str]:
    async def _run() -> set[str]:
        engine = build_engine(database_url, poolclass=pool.NullPool)
        try:
            async with engine.connect() as conn:
                rows = (
                    await conn.execute(
                        text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
                    )
                ).fetchall()
                return {row[0] for row in rows}
        finally:
            await engine.dispose()

    return asyncio.run(_run())


def test_identity_migration_applies_on_empty_database() -> None:
    """Downgrade to bare public schema, then upgrade head (same as a fresh Postgres)."""
    database_url = os.environ["DATABASE_URL"]
    _reset_public_schema(database_url)

    command.upgrade(_alembic_config(), "head")
    tables = _list_public_tables(database_url)

    assert IDENTITY_TABLES.issubset(tables)
    assert "alembic_version" in tables

    command.upgrade(_alembic_config(), "head")
