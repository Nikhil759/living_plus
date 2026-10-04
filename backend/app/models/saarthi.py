import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    ActionStatus,
    ChatFeedback,
    ChatMessageStatus,
    ChatRole,
    LlmOutcome,
    LlmPurpose,
)
from app.models.types import JsonDict, JsonList, UTCDateTime, enum_column


class ChatSession(Base, IdTimestampMixin):
    """One Saarthi conversation. Private to the resident who started it."""

    __tablename__ = "chat_sessions"
    __table_args__ = (
        Index("ix_chat_sessions_recent", "society_id", "user_id", "last_message_at"),
    )

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(80))
    last_message_at: Mapped[datetime] = mapped_column(UTCDateTime)
    # Soft delete: the resident no longer sees it, but feedback stays for evaluation.
    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class ChatMessage(Base, IdTimestampMixin):
    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_session", "session_id", "created_at"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE")
    )
    role: Mapped[ChatRole] = mapped_column(enum_column(ChatRole, "chat_role"))
    content: Mapped[str] = mapped_column(Text)
    citations: Mapped[list[Any]] = mapped_column(JsonList(), default=list)
    cards: Mapped[list[Any]] = mapped_column(JsonList(), default=list)
    status: Mapped[ChatMessageStatus] = mapped_column(
        enum_column(ChatMessageStatus, "chat_message_status"), default=ChatMessageStatus.ok
    )
    feedback: Mapped[ChatFeedback | None] = mapped_column(
        enum_column(ChatFeedback, "chat_feedback"), nullable=True
    )
    feedback_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # The confirmation card shown under this reply, if any.
    action_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("saarthi_actions.id", ondelete="SET NULL"), nullable=True
    )


class SaarthiAction(Base, IdTimestampMixin):
    """A change Saarthi proposed. Nothing happens until the resident confirms it.

    Doubles as the audit trail of every action taken through Saarthi.
    """

    __tablename__ = "saarthi_actions"
    __table_args__ = (Index("ix_saarthi_actions_user", "society_id", "user_id", "created_at"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE")
    )
    tool: Mapped[str] = mapped_column(String(60))
    # Service-ready arguments (ids resolved), replayed on confirm.
    payload: Mapped[dict[str, Any]] = mapped_column(JsonDict(), default=dict)
    # What the resident saw on the card.
    card: Mapped[dict[str, Any]] = mapped_column(JsonDict(), default=dict)
    status: Mapped[ActionStatus] = mapped_column(
        enum_column(ActionStatus, "action_status"), default=ActionStatus.proposed
    )
    result: Mapped[dict[str, Any]] = mapped_column(JsonDict(), default=dict)
    error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)
    decided_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class LlmCall(Base, IdTimestampMixin):
    """One model request: what it cost, how long it took and how it ended."""

    __tablename__ = "llm_calls"
    __table_args__ = (Index("ix_llm_calls_daily", "society_id", "created_at"),)

    society_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True
    )
    message_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True
    )
    purpose: Mapped[LlmPurpose] = mapped_column(enum_column(LlmPurpose, "llm_purpose"))
    model: Mapped[str] = mapped_column(String(60))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(12, 6), default=Decimal(0))
    latency_ms: Mapped[int] = mapped_column(Integer)
    outcome: Mapped[LlmOutcome] = mapped_column(enum_column(LlmOutcome, "llm_outcome"))
    error_code: Mapped[str | None] = mapped_column(String(60), nullable=True)
    trace_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detail: Mapped[dict[str, Any]] = mapped_column(JsonDict(), default=dict)
