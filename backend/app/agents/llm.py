"""Gemini chat models for Saarthi. Routers get them through a dependency so tests can swap fakes."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends
from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.core.errors import AppError
from app.models.enums import LlmOutcome

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NamedModel:
    name: str
    model: BaseChatModel


@dataclass(frozen=True)
class ChatModels:
    """Primary model for the job, then the other one as fallback."""

    primary: NamedModel
    fallback: NamedModel


def _gemini(name: str) -> NamedModel:
    settings = get_settings()
    model = ChatGoogleGenerativeAI(
        model=name,
        google_api_key=settings.GEMINI_API_KEY,
        timeout=settings.SAARTHI_TIMEOUT_SECONDS,
        # One retry inside the client; after that the caller falls back to the other model.
        max_retries=1,
    )
    return NamedModel(name=name, model=model)


@lru_cache
def _chat_models() -> ChatModels:
    settings = get_settings()
    return ChatModels(
        primary=_gemini(settings.GEMINI_MODEL_MAIN),
        fallback=_gemini(settings.GEMINI_MODEL_FAST),
    )


def get_chat_models() -> ChatModels:
    if not get_settings().GEMINI_API_KEY:
        raise AppError("saarthi_unavailable", "Saarthi isn't available right now.", 503)
    return _chat_models()


ChatModelsDep = Annotated[ChatModels, Depends(get_chat_models)]


@dataclass(frozen=True)
class QuickResult[T]:
    """A one-shot call on the fast model (falling back to the main one)."""

    value: T | None
    model: NamedModel
    outcome: LlmOutcome
    error: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0


def token_usage(message: Any) -> tuple[int, int]:
    usage = getattr(message, "usage_metadata", None) or {}
    return int(usage.get("input_tokens", 0)), int(usage.get("output_tokens", 0))


async def fast_first[T](
    models: ChatModels, call: Callable[[NamedModel], Awaitable[tuple[T | None, Any]]], label: str
) -> QuickResult[T]:
    """Fast model first (cheap and quick), then the main model once.

    `call` returns (value or None if unusable, the raw model message for token counts).
    """
    error = None
    tried = ((models.fallback, LlmOutcome.ok), (models.primary, LlmOutcome.fallback))
    for named, outcome in tried:
        try:
            async with asyncio.timeout(get_settings().SAARTHI_TIMEOUT_SECONDS):
                value, raw = await call(named)
            tokens = token_usage(raw)
            if value is not None:
                return QuickResult(value, named, outcome, None, *tokens)
            error = "unparsed"
        except Exception as exc:  # Provider or parsing failure: try the other model once.
            error = type(exc).__name__
            logger.warning(f"saarthi {label} failed", extra={"model": named.name, "error": error})
    return QuickResult(None, models.primary, LlmOutcome.error, error)
