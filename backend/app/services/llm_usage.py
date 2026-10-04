import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.pricing import cost_usd
from app.core.logging import request_id_ctx
from app.models import LlmCall
from app.models.enums import LlmOutcome, LlmPurpose


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
