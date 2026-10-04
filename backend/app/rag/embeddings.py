"""Gemini embeddings for the society guide. Tests swap `get_embedder` for a fake."""

import asyncio
import logging
import math
from array import array
from functools import lru_cache
from typing import Protocol

from google import genai
from google.genai import types

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DIMENSIONS = 768  # gemini-embedding-001 supports reduced sizes; 768 keeps blobs small.
BATCH = 50


class Embedder(Protocol):
    model: str

    async def embed(self, texts: list[str], *, query: bool) -> list[list[float]]: ...


def normalise(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


def pack(vector: list[float]) -> bytes:
    return array("f", vector).tobytes()


def unpack(blob: bytes) -> list[float]:
    values = array("f")
    values.frombytes(blob)
    return values.tolist()


class GeminiEmbedder:
    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self.model = model
        self._client = genai.Client(api_key=api_key)
        self._timeout = timeout

    async def _batch(self, texts: list[str], task_type: str) -> list[list[float]]:
        config = types.EmbedContentConfig(task_type=task_type, output_dimensionality=DIMENSIONS)
        for attempt in (1, 2):
            try:
                async with asyncio.timeout(self._timeout):
                    response = await self._client.aio.models.embed_content(
                        model=self.model, contents=texts, config=config
                    )
                return [normalise(list(e.values or [])) for e in response.embeddings or []]
            except Exception:
                if attempt == 2:
                    raise
                logger.warning("embedding call failed; retrying once")
        raise AssertionError("unreachable")

    async def embed(self, texts: list[str], *, query: bool) -> list[list[float]]:
        task = "RETRIEVAL_QUERY" if query else "RETRIEVAL_DOCUMENT"
        vectors: list[list[float]] = []
        for start in range(0, len(texts), BATCH):
            vectors.extend(await self._batch(texts[start : start + BATCH], task))
        return vectors


@lru_cache
def _gemini() -> GeminiEmbedder:
    settings = get_settings()
    return GeminiEmbedder(
        settings.GEMINI_API_KEY, settings.GEMINI_EMBED_MODEL, settings.SAARTHI_TIMEOUT_SECONDS
    )


def get_embedder() -> Embedder | None:
    """None without an API key: the guide still works with keyword search."""
    return _gemini() if get_settings().GEMINI_API_KEY else None
