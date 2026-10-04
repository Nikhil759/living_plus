"""Small TTL cache: Redis when reachable, otherwise in-process (fine for one API instance)."""

import json
import logging
import time
from functools import lru_cache
from typing import Any, Protocol

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Cache(Protocol):
    async def get(self, key: str) -> Any | None: ...

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None: ...


class MemoryCache:
    def __init__(self) -> None:
        self._items: dict[str, tuple[float, Any]] = {}

    async def get(self, key: str) -> Any | None:
        item = self._items.get(key)
        if item is None or item[0] < time.monotonic():
            self._items.pop(key, None)
            return None
        return item[1]

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._items[key] = (time.monotonic() + ttl_seconds, value)

    def clear(self) -> None:
        self._items.clear()


class RedisCache:
    def __init__(self, url: str, fallback: MemoryCache) -> None:
        self._redis = Redis.from_url(url, socket_connect_timeout=1, socket_timeout=1)
        self._fallback = fallback

    async def get(self, key: str) -> Any | None:
        try:
            raw = await self._redis.get(f"cache:{key}")
            return json.loads(raw) if raw else None
        except (RedisError, OSError):
            return await self._fallback.get(key)

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        try:
            await self._redis.set(f"cache:{key}", json.dumps(value), ex=ttl_seconds)
        except (RedisError, OSError):
            logger.warning("redis unavailable for cache; using in-process store")
            await self._fallback.set(key, value, ttl_seconds)


@lru_cache
def get_cache() -> Cache:
    settings = get_settings()
    memory = MemoryCache()
    return memory if settings.ENV == "test" else RedisCache(settings.REDIS_URL, memory)
