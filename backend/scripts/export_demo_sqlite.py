"""Merge Postgres demo data into frontend/.demo/demo.db (after JSON seed).

Usage (from backend/, DATABASE_URL must be set):
    uv run python scripts/export_demo_sqlite.py

Run `npm run demo:seed --prefix frontend` first for full catalog (marketplace, etc.).
This script overwrites events, amenities, announcements, and per-user residents from PG.
"""

from __future__ import annotations

import asyncio
import json
import sqlite3
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.db import get_sessionmaker
from app.models import Membership, MembershipStatus, Profile, Society
from app.services import home as home_service
from app.services import mappers

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "frontend" / ".demo" / "demo.db"
SCHEMA_PATH = REPO_ROOT / "frontend" / "lib" / "demo-store" / "schema.sql"


def _open_sqlite() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    if SCHEMA_PATH.is_file():
        conn.executescript(SCHEMA_PATH.read_text())
    return conn


def _upsert_entity(
    conn: sqlite3.Connection,
    collection: str,
    record_id: str,
    payload: dict,
) -> None:
    conn.execute(
        """
        INSERT INTO demo_entity (collection, id, payload) VALUES (?, ?, ?)
        ON CONFLICT(collection, id) DO UPDATE SET payload = excluded.payload
        """,
        (collection, record_id, json.dumps(payload)),
    )


def _upsert_resident(conn: sqlite3.Connection, user_key: str, payload: dict) -> None:
    from datetime import UTC, datetime

    now = datetime.now(tz=UTC).isoformat()
    conn.execute(
        """
        INSERT INTO demo_resident (user_id, payload, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
        """,
        (user_key, json.dumps(payload), now),
    )


async def _export(session: AsyncSession, conn: sqlite3.Connection) -> None:
    society = await session.scalar(select(Society).order_by(Society.created_at).limit(1))
    if society is None:
        print("No society in Postgres; skipping export.")
        return

    events = await mappers.map_events(session, society.id)
    for event in events:
        _upsert_entity(conn, "events", event.id, event.model_dump(by_alias=True, mode="json"))

    amenities = await mappers.map_amenities(session, society.id)
    for amenity in amenities:
        payload = amenity.model_dump(by_alias=True, mode="json")
        _upsert_entity(conn, "amenities", amenity.id, payload)

    digest = await mappers.map_digest(session, society.id, tower_name="Your tower")
    if digest:
        for item in digest.items:
            _upsert_entity(
                conn,
                "announcements",
                item.id,
                item.model_dump(by_alias=True, mode="json"),
            )

    memberships = (
        await session.execute(
            select(Membership)
            .where(
                Membership.society_id == society.id,
                Membership.status == MembershipStatus.approved,
            )
            .options(joinedload(Membership.user), joinedload(Membership.flat))
        )
    ).scalars().all()

    for membership in memberships:
        user = membership.user
        if user is None:
            continue
        tower_name, flat_no = await home_service.load_tower_flat(session, membership.id)
        profile = await session.get(Profile, user.id)
        resident = mappers.map_resident(
            user,
            society,
            membership,
            tower_name=tower_name,
            flat_no=flat_no,
            profile=profile,
        )
        payload = resident.model_dump(by_alias=True, mode="json")
        _upsert_resident(conn, user.supabase_uid, payload)
        if user.email and "demo@" in user.email:
            _upsert_resident(conn, "__default__", payload)


async def main() -> None:
    if not DB_PATH.parent.exists():
        print(f"Run frontend demo seed first (npm run demo:seed). Expected dir {DB_PATH.parent}")
    conn = _open_sqlite()
    try:
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as session:
            await _export(session, conn)
        conn.commit()
        print(f"Merged Postgres demo data into {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(main())
