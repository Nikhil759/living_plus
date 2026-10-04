"""Saarthi's system prompt: the tunable persona file plus per-request context."""

from datetime import datetime
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

PERSONA_PATH = Path(__file__).parent / "prompts" / "saarthi.md"
IST = ZoneInfo("Asia/Kolkata")

# Grows as phases add the guide (retrieval) and live data tools.
CAPABILITIES = (
    "Right now you have no society guide passages and no live data tools. "
    "For any rule, fee, timing or live question, say you couldn't find it in the society guide "
    "or can't check that yet, and never guess."
)


@lru_cache
def persona() -> str:
    return PERSONA_PATH.read_text(encoding="utf-8").strip()


def system_prompt(
    *, first_name: str, society_name: str, page: str | None, now: datetime
) -> str:
    local = now.astimezone(IST)
    context = [
        f"Resident's first name: {first_name}",
        f"Society: {society_name}",
        f"Today: {local:%A, %d %B %Y}, {local:%I:%M %p} IST",
        f"Page the resident is on: {page or 'unknown'}",
    ]
    return f"{persona()}\n\n{CAPABILITIES}\n\nContext:\n" + "\n".join(f"- {c}" for c in context)
