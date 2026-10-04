"""Fixed-window rate limits: Redis when reachable, otherwise in-process counters."""

import logging
import time
from functools import lru_cache
from typing import Protocol

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)


class Counter(Protocol):
    async def hit(self, key: str, window_seconds: int) -> int: ...


class MemoryCounter:
    """Per-process only; fine for one API instance and for tests."""

    def __init__(self) -> None:
        self._counts: dict[str, int] = {}

    async def hit(self, key: str, window_seconds: int) -> int:
        bucket = f"{key}:{int(time.time()) // window_seconds}"
        self._counts[bucket] = self._counts.get(bucket, 0) + 1
        return self._counts[bucket]

    def reset(self) -> None:
        self._counts.clear()


class RedisCounter:
    def __init__(self, url: str, fallback: MemoryCounter) -> None:
        self._redis = Redis.from_url(url, socket_connect_timeout=1, socket_timeout=1)
        self._fallback = fallback

    async def hit(self, key: str, window_seconds: int) -> int:
        bucket = f"rl:{key}:{int(time.time()) // window_seconds}"
        try:
            async with self._redis.pipeline(transaction=True) as pipe:
                count, _ = await pipe.incr(bucket).expire(bucket, window_seconds).execute()
            return int(count)
        except (RedisError, OSError):
            # Limits must never take the app down; degrade to per-process counting.
            logger.warning("redis unavailable for rate limits; using in-process counters")
            return await self._fallback.hit(key, window_seconds)


@lru_cache
def get_counter() -> Counter:
    settings = get_settings()
    memory = MemoryCounter()
    if settings.ENV == "test":
        return memory
    return RedisCounter(settings.REDIS_URL, memory)


async def enforce(key: str, limits: list[tuple[int, int]], message: str) -> None:
    """`limits` is [(max_hits, window_seconds), ...]; every window must have room."""
    counter = get_counter()
    for max_hits, window in limits:
        if await counter.hit(f"{key}:{window}", window) > max_hits:
            raise AppError("rate_limited", message, 429)
