import math
import re
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.pricing import cost_usd
from app.agents.prompts import IST
from app.auth import CurrentMember
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import request_id_ctx
from app.models import ChatMessage, LlmCall
from app.models.enums import ChatFeedback, LlmOutcome, LlmPurpose
from app.schemas.saarthi import (
    UnansweredOut,
    UsageDayOut,
    UsageFeedbackOut,
    UsageOut,
    UsagePurposeOut,
)
from app.services.marketplace import is_committee


def record_call(
    db: AsyncSession,
    *,
    society_id: uuid.UUID,
    user_id: uuid.UUID | None,
    purpose: LlmPurpose,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
    outcome: LlmOutcome,
    error_code: str | None = None,
    session_id: uuid.UUID | None = None,
    message_id: uuid.UUID | None = None,
    detail: dict[str, Any] | None = None,
) -> LlmCall:
    """Adds the row; the caller commits with the rest of its unit of work."""
    call = LlmCall(
        society_id=society_id,
        user_id=user_id,
        session_id=session_id,
        message_id=message_id,
        purpose=purpose,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost_usd(model, input_tokens, output_tokens),
        latency_ms=latency_ms,
        outcome=outcome,
        error_code=error_code,
        trace_id=request_id_ctx.get(),
        detail=detail or {},
    )
    db.add(call)
    return call


# --- committee AI usage page -----------------------------------------------------------------

TOP_UNANSWERED = 10
_PUNCT = re.compile(r"[^\w\s]")


def _percentile(sorted_ms: list[int], share: float) -> int:
    """Nearest-rank percentile; 0 for an empty day."""
    if not sorted_ms:
        return 0
    rank = max(math.ceil(share * len(sorted_ms)), 1)
    return sorted_ms[rank - 1]


def _day(date: str, calls: list[LlmCall], usd_to_inr: float) -> UsageDayOut:
    # Guide indexing (embeddings) costs tokens but isn't a resident waiting for an answer.
    served = [c for c in calls if c.purpose != LlmPurpose.embed]
    latencies = sorted(c.latency_ms for c in served)
    cost = float(sum((c.cost_usd for c in calls), Decimal(0)))
    return UsageDayOut(
        date=date,
        requests=len(served),
        input_tokens=sum(c.input_tokens for c in calls),
        output_tokens=sum(c.output_tokens for c in calls),
        cost_usd=round(cost, 4),
        cost_inr=round(cost * usd_to_inr, 2),
        p50_ms=_percentile(latencies, 0.5),
        p95_ms=_percentile(latencies, 0.95),
        errors=sum(1 for c in served if c.outcome == LlmOutcome.error),
    )


def _unanswered(calls: list[LlmCall]) -> list[UnansweredOut]:
    groups: dict[str, list[LlmCall]] = defaultdict(list)
    for call in calls:
        question = str((call.detail or {}).get("question") or "").strip()
        if call.detail and call.detail.get("unanswered") and question:
            key = " ".join(_PUNCT.sub(" ", question.lower()).split())
            groups[key].append(call)
    ranked = sorted(
        groups.values(), key=lambda g: (len(g), max(c.created_at for c in g)), reverse=True
    )
    out = []
    for group in ranked[:TOP_UNANSWERED]:
        latest = max(group, key=lambda c: c.created_at)
        out.append(
            UnansweredOut(
                question=str(latest.detail["question"]),
                count=len(group),
                last_asked=latest.created_at.replace(tzinfo=UTC).isoformat(),
            )
        )
    return out


async def usage(db: AsyncSession, member: CurrentMember, days: int) -> UsageOut:
    if not is_committee(member):
        raise AppError("forbidden", "Only the committee can see AI usage.", 403)
    usd_to_inr = get_settings().USD_TO_INR
    today = datetime.now(UTC).astimezone(IST).date()
    first = today - timedelta(days=days - 1)
    since = datetime.combine(first, datetime.min.time(), tzinfo=IST).astimezone(UTC)
    calls = list(
        await db.scalars(
            select(LlmCall).where(
                LlmCall.society_id == member.society_id,
                LlmCall.created_at >= since.replace(tzinfo=None),
            )
        )
    )
    by_day: dict[str, list[LlmCall]] = defaultdict(list)
    by_purpose: dict[str, list[LlmCall]] = defaultdict(list)
    for call in calls:
        local = call.created_at.replace(tzinfo=UTC).astimezone(IST).date().isoformat()
        by_day[local].append(call)
        by_purpose[call.purpose.value].append(call)
    day_list = [
        _day(d.isoformat(), by_day.get(d.isoformat(), []), usd_to_inr)
        for d in (first + timedelta(days=n) for n in range(days))
    ]
    rated = (
        await db.execute(
            select(ChatMessage.feedback, func.count())
            .where(
                ChatMessage.society_id == member.society_id,
                ChatMessage.feedback.is_not(None),
                ChatMessage.created_at >= since.replace(tzinfo=None),
            )
            .group_by(ChatMessage.feedback)
        )
    ).all()
    counts = {feedback: int(n) for feedback, n in rated}
    up, down = counts.get(ChatFeedback.up, 0), counts.get(ChatFeedback.down, 0)
    return UsageOut(
        days=day_list,
        today=day_list[-1],
        by_purpose=sorted(
            (
                UsagePurposeOut(
                    purpose=purpose,
                    requests=len(group),
                    cost_inr=round(
                        float(sum((c.cost_usd for c in group), Decimal(0))) * usd_to_inr, 2
                    ),
                )
                for purpose, group in by_purpose.items()
            ),
            key=lambda p: p.requests,
            reverse=True,
        ),
        feedback=UsageFeedbackOut(
            up=up, down=down, up_ratio=round(up / (up + down), 3) if up + down else None
        ),
        unanswered=_unanswered(calls),
    )
