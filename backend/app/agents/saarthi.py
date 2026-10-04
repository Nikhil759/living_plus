"""Runs one Saarthi turn through the graph and turns its stream into simple events."""

import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.agents.graph import Retriever, Toolbox, saarthi_graph
from app.agents.llm import ChatModels
from app.agents.tracing import trace_callbacks
from app.models.enums import ChatRole, LlmOutcome
from app.rag.retrieval import Passage
from app.schemas.saarthi import SaarthiCard

_MARKER = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\]")


@dataclass
class TurnResult:
    text: str
    model: str
    outcome: LlmOutcome
    input_tokens: int
    output_tokens: int
    error_code: str | None
    passages: list[Passage] = field(default_factory=list)
    guide_found: bool = False
    cards: list[SaarthiCard] = field(default_factory=list)
    tool_log: list[dict[str, Any]] = field(default_factory=list)


def citations_for(text: str, passages: list[Passage]) -> list[dict[str, Any]]:
    """The passages the reply actually cites with [n] markers, once each, in order of use."""
    cited: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for match in _MARKER.finditer(text):
        for number in match.group(1).split(","):
            index = int(number) - 1
            if not 0 <= index < len(passages):
                continue
            passage = passages[index]
            key = (str(passage.document_id), passage.anchor)
            if key in seen:
                continue
            seen.add(key)
            cited.append(
                {
                    "label": passage.label,
                    "documentId": key[0],
                    "anchor": passage.anchor,
                    "date": passage.doc_date.isoformat() if passage.doc_date else None,
                }
            )
    return cited


def build_messages(
    system: str, history: list[tuple[ChatRole, str]], message: str
) -> list[BaseMessage]:
    turns: list[BaseMessage] = [SystemMessage(system)]
    for role, content in history:
        turns.append(HumanMessage(content) if role == ChatRole.user else AIMessage(content))
    turns.append(HumanMessage(message))
    return turns


async def stream_turn(
    models: ChatModels,
    retriever: Retriever,
    toolbox: Toolbox,
    messages: list[BaseMessage],
    retrieval_query: str,
    trace_tags: dict[str, str],
) -> AsyncIterator[tuple[str, Any]]:
    """Yields ("status"|"delta"|"reset", payload) while streaming, then ("result", TurnResult)."""
    final: dict[str, Any] = {}
    config = {
        "configurable": {"models": models, "retriever": retriever, "toolbox": toolbox},
        # Each tool round is two graph steps; keep headroom over the tool-round cap.
        "recursion_limit": 25,
        "callbacks": trace_callbacks(),
        "run_name": "saarthi_chat",
        "metadata": trace_tags,
    }
    async for mode, data in saarthi_graph.astream(
        {"messages": messages, "retrieval_query": retrieval_query},
        config,
        stream_mode=["custom", "values"],
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
        passages=final.get("passages", []),
        guide_found=final.get("guide_found", False),
        cards=final.get("cards", []),
        tool_log=final.get("tool_log", []),
    )
