from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def build_engine(url: str, **kwargs: Any) -> AsyncEngine:
    # Supabase's pooler runs pgbouncer in transaction mode, which breaks asyncpg's
    # prepared-statement caches. Disabling them is harmless on a direct connection.
    # SQLAlchemy only accepts its own cache setting as a URL query parameter.
    url_no_cache = make_url(url).update_query_dict({"prepared_statement_cache_size": "0"})
    return create_async_engine(
        url_no_cache,
        connect_args={"statement_cache_size": 0, "timeout": 5},
        pool_pre_ping=True,
        **kwargs,
    )


@lru_cache
def get_engine() -> AsyncEngine:
    return build_engine(get_settings().DATABASE_URL)


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    # expire_on_commit=False: objects stay readable after commit, which async can't lazy-reload.
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """One session per request. Services commit explicitly; uncommitted work is rolled back."""
    async with get_sessionmaker()() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]
