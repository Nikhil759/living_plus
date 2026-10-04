"""Runs one Saarthi turn through the graph and turns its stream into simple events."""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.agents.graph import saarthi_graph
from app.agents.llm import ChatModels
from app.agents.tracing import trace_callbacks
from app.models.enums import ChatRole, LlmOutcome


@dataclass
class TurnResult:
    text: str
    model: str
    outcome: LlmOutcome
    input_tokens: int
    output_tokens: int
    error_code: str | None


def build_messages(
    system: str, history: list[tuple[ChatRole, str]], message: str
) -> list[BaseMessage]:
    turns: list[BaseMessage] = [SystemMessage(system)]
    for role, content in history:
        turns.append(HumanMessage(content) if role == ChatRole.user else AIMessage(content))
    turns.append(HumanMessage(message))
    return turns


async def stream_turn(
    models: ChatModels, messages: list[BaseMessage], trace_tags: dict[str, str]
) -> AsyncIterator[tuple[str, Any]]:
    """Yields ("status"|"delta"|"reset", payload) while streaming, then ("result", TurnResult)."""
    final: dict[str, Any] = {}
    config = {
        "configurable": {"models": models},
        "callbacks": trace_callbacks(),
        "run_name": "saarthi_chat",
        "metadata": trace_tags,
    }
    async for mode, data in saarthi_graph.astream(
        {"messages": messages}, config, stream_mode=["custom", "values"]
    ):
        if mode == "values":
            final = data
            continue
        for kind in ("status", "delta", "reset"):
            if kind in data:
                yield kind, data[kind]

    reply = final["messages"][-1] if final.get("outcome") != LlmOutcome.error else None
    yield "result", TurnResult(
        text=reply.text if reply is not None else "",
        model=final["model"],
        outcome=final["outcome"],
        input_tokens=final["input_tokens"],
        output_tokens=final["output_tokens"],
        error_code=final["error_code"],
    )
