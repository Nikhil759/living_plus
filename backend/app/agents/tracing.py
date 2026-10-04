"""Optional Langfuse tracing. Our own llm_calls table is always written regardless."""

from functools import lru_cache

from langchain_core.callbacks import BaseCallbackHandler

from app.core.config import get_settings


@lru_cache
def _langfuse_handler() -> BaseCallbackHandler | None:
    settings = get_settings()
    if not (settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY):
        return None
    # Imported lazily: the Langfuse SDK starts exporters on import of its client.
    from langfuse import Langfuse
    from langfuse.langchain import CallbackHandler

    Langfuse(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        host=settings.LANGFUSE_HOST,
        environment=settings.ENV,
    )
    return CallbackHandler(public_key=settings.LANGFUSE_PUBLIC_KEY)


def trace_callbacks() -> list[BaseCallbackHandler]:
    handler = _langfuse_handler()
    return [handler] if handler else []
