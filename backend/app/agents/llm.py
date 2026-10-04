"""Gemini chat models for Saarthi. Routers get them through a dependency so tests can swap fakes."""

from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.core.errors import AppError


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
