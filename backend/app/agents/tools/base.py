"""Saarthi tool plumbing: per-request context, results, cards and name matching."""

import difflib
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.schemas.saarthi import SaarthiCard

IST = ZoneInfo("Asia/Kolkata")


class ToolInputError(ValueError):
    """Shown to the model so it can fix its arguments; never an HTTP error."""


@dataclass(frozen=True)
class ToolContext:
    """Who is asking. Built from the session, never from model output."""

    db: AsyncSession
    member: CurrentMember
    now: datetime

    @property
    def today(self) -> date:
        return self.now.astimezone(IST).date()


@dataclass
class ToolResult:
    data: Any
    cards: list[SaarthiCard] = field(default_factory=list)


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    args: type[BaseModel]
    status: str  # shown while it runs, e.g. "Checking court availability…"
    run: Callable[[ToolContext, Any], Awaitable[ToolResult]]

    def schema(self) -> dict[str, Any]:
        return function_schema(self.name, self.description, self.args)

    async def __call__(self, ctx: ToolContext, raw_args: dict[str, Any]) -> ToolResult:
        return await self.run(ctx, parse_args(self.args, raw_args))


def parse_args(model: type[BaseModel], raw_args: dict[str, Any] | None) -> Any:
    try:
        return model.model_validate(raw_args or {})
    except ValidationError as exc:
        problems = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
        raise ToolInputError(f"Invalid arguments: {problems}") from None


def function_schema(name: str, description: str, args: type[BaseModel]) -> dict[str, Any]:
    """OpenAI-style function schema; langchain-google-genai converts it for Gemini."""
    parameters = args.model_json_schema()
    parameters.pop("title", None)
    for prop in parameters.get("properties", {}).values():
        prop.pop("title", None)
        # "" is the "not given" default; Gemini rejects empty enum values, and leaving the
        # argument out has the same meaning.
        if "enum" in prop:
            prop["enum"] = [v for v in prop["enum"] if v != ""]
    return {
        "type": "function",
        "function": {"name": name, "description": description, "parameters": parameters},
    }


@dataclass
class Proposal:
    """What a write tool would do. Shown on a confirmation card; nothing has changed yet."""

    title: str
    lines: list[tuple[str, str]]
    # JSON-safe, service-ready arguments replayed by `execute` on Confirm.
    payload: dict[str, Any]
    warning: str | None = None
    # Who must approve after the resident confirms, e.g. "the Managing Committee".
    approval: str | None = None
    # "{action}" is replaced with the action id (forms prefill from it).
    edit_href: str | None = None
    # The app needs something chat can't supply (e.g. a photo): only "Edit in form" is offered.
    draft_only: bool = False
    confirm_label: str = "Confirm"


@dataclass
class Outcome:
    message: str
    href: str | None = None
    # True when the change is waiting for committee approval.
    pending: bool = False


@dataclass(frozen=True)
class WriteSpec:
    name: str
    description: str
    args: type[BaseModel]
    prepare: Callable[[ToolContext, Any], Awaitable[Proposal]]
    execute: Callable[[ToolContext, dict[str, Any]], Awaitable[Outcome]]
    committee_only: bool = False
    status: str = "Getting that ready…"

    def schema(self) -> dict[str, Any]:
        return function_schema(self.name, self.description, self.args)

    async def propose(self, ctx: ToolContext, raw_args: dict[str, Any]) -> Proposal:
        return await self.prepare(ctx, parse_args(self.args, raw_args))


class NoArgs(BaseModel):
    pass


def parse_day(value: str, ctx: ToolContext) -> date:
    """'YYYY-MM-DD', 'today' or 'tomorrow'; empty means today."""
    text = value.strip().lower()
    if text in ("", "today", "tonight"):
        return ctx.today
    if text == "tomorrow":
        return ctx.today + timedelta(days=1)
    try:
        return date.fromisoformat(text)
    except ValueError:
        raise ToolInputError(f"'{value}' is not a date; use YYYY-MM-DD.") from None


def match_name(query: str, options: dict[str, str], cutoff: float = 0.4) -> str | None:
    """Best option id for a loose name ("badminton 2", "the hall"), or None."""
    wanted = re.sub(r"\b(the|court|room)\b", " ", query.lower()).strip()
    if not wanted:
        return None
    names = {oid: name.lower() for oid, name in options.items()}
    exact = [oid for oid, name in names.items() if name == wanted]
    if exact:
        return exact[0]
    contains = [oid for oid, name in names.items() if wanted in name or name in wanted]
    if len(contains) == 1:
        return contains[0]
    pool = contains or list(names)
    close = difflib.get_close_matches(wanted, [names[oid] for oid in pool], n=1, cutoff=cutoff)
    if close:
        return next(oid for oid in pool if names[oid] == close[0])
    return None


def ist_time(value: datetime | str) -> str:
    moment = datetime.fromisoformat(value) if isinstance(value, str) else value
    local = moment.astimezone(IST)
    hour = local.strftime("%I").lstrip("0")
    minutes = "" if local.minute == 0 else f":{local:%M}"
    return f"{hour}{minutes} {local:%p}"


def ist_day(value: datetime | str | date) -> str:
    day = (
        value
        if isinstance(value, date) and not isinstance(value, datetime)
        else (
            (datetime.fromisoformat(value) if isinstance(value, str) else value)
            .astimezone(IST)
            .date()
        )
    )
    return f"{day:%a} {day.day} {day:%b}"
