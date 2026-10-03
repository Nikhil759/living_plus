import asyncio
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, pool

from app.core.db import build_engine

BACKEND_DIR = Path(__file__).resolve().parent.parent

IDENTITY_TABLES = frozenset({"users", "societies", "towers", "flats", "memberships", "profiles"})
DOMAIN_TABLES = frozenset(
    {
        "amenities",
        "amenity_status",
        "amenity_bookings",
        "groups",
        "group_members",
        "whatsapp_groups",
        "posts",
        "events",
        "event_tickets",
        "membership_invites",
    }
)


def _alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["configure_logger"] = False
    return config


def _reset_schema(database_url: str) -> None:
    async def _run() -> None:
        engine = build_engine(database_url, poolclass=pool.NullPool)
        try:
            async with engine.begin() as conn:

                def _drop_all(sync_conn):
                    inspector = inspect(sync_conn)
                    sync_conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
                    for table in inspector.get_table_names():
                        sync_conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{table}"')
                    sync_conn.exec_driver_sql("PRAGMA foreign_keys=ON")

                await conn.run_sync(_drop_all)
        finally:
            await engine.dispose()

    asyncio.run(_run())


def _list_tables(database_url: str) -> set[str]:
    async def _run() -> set[str]:
        engine = build_engine(database_url, poolclass=pool.NullPool)
        try:
            async with engine.connect() as conn:

                def _tables(sync_conn) -> set[str]:
                    return set(inspect(sync_conn).get_table_names())

                return await conn.run_sync(_tables)
        finally:
            await engine.dispose()

    return asyncio.run(_run())


def test_identity_migration_applies_on_empty_database() -> None:
    """Wipe the SQLite file schema, then upgrade head (same as a fresh database)."""
    database_url = os.environ["DATABASE_URL"]
    _reset_schema(database_url)

    command.upgrade(_alembic_config(), "head")
    tables = _list_tables(database_url)

    assert IDENTITY_TABLES.issubset(tables)
    assert DOMAIN_TABLES.issubset(tables)
    assert "alembic_version" in tables

    command.upgrade(_alembic_config(), "head")
