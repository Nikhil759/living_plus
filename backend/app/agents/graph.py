"""Saarthi's LangGraph. Phase 1: one node that answers; later phases add tools and confirmations."""

import asyncio
import logging
from typing import Any

from langchain_core.messages import AIMessageChunk, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.types import StreamWriter

from app.agents.llm import ChatModels, NamedModel
from app.core.config import get_settings
from app.models.enums import LlmOutcome

logger = logging.getLogger(__name__)


class SaarthiState(MessagesState):
    model: str
    outcome: LlmOutcome
    input_tokens: int
    output_tokens: int
    error_code: str | None


async def _stream_answer(
    named: NamedModel,
    messages: list[BaseMessage],
    config: RunnableConfig,
    writer: StreamWriter,
    emitted: list[bool],
) -> AIMessageChunk:
    reply: AIMessageChunk | None = None
    async with asyncio.timeout(get_settings().SAARTHI_TIMEOUT_SECONDS):
        async for chunk in named.model.astream(messages, config):
            reply = chunk if reply is None else reply + chunk
            if chunk.text:
                emitted[0] = True
                writer({"delta": chunk.text})
    if reply is None or not reply.text.strip():
        raise ValueError("empty reply")
    return reply


async def respond(state: SaarthiState, config: RunnableConfig) -> dict[str, Any]:
    models: ChatModels = config["configurable"]["models"]
    writer = get_stream_writer()
    writer({"status": "Thinking…"})
    error_code = "unknown"
    for named, outcome in ((models.primary, LlmOutcome.ok), (models.fallback, LlmOutcome.fallback)):
        emitted = [False]
        try:
            reply = await _stream_answer(named, state["messages"], config, writer, emitted)
        except Exception as exc:  # Any provider failure: try the other model once.
            error_code = type(exc).__name__
            logger.warning("saarthi model failed", extra={"model": named.name, "error": error_code})
            if emitted[0]:
                # Partial text from the failed model must not mix with the fallback's answer.
                writer({"reset": True})
            continue
        usage = reply.usage_metadata or {}
        return {
            "messages": [reply],
            "model": named.name,
            "outcome": outcome,
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "error_code": None,
        }
    return {
        "model": models.fallback.name,
        "outcome": LlmOutcome.error,
        "input_tokens": 0,
        "output_tokens": 0,
        "error_code": error_code[:60],
    }


def _build() -> Any:
    graph = StateGraph(SaarthiState)
    graph.add_node("respond", respond)
    graph.add_edge(START, "respond")
    graph.add_edge("respond", END)
    return graph.compile()


saarthi_graph = _build()
