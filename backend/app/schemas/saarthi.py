import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import StringConstraints

from app.core.config import get_settings
from app.models.enums import ChatFeedback, ChatMessageStatus, ChatRole
from app.schemas.base import CamelModel

Message = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=1, max_length=get_settings().SAARTHI_MAX_MESSAGE_CHARS
    ),
]
# App pathname the resident is on, e.g. "/amenities/badminton-2"; used for context only.
Page = Annotated[str, StringConstraints(max_length=64, pattern=r"^/[A-Za-z0-9/_-]*$")]


class ChatIn(CamelModel):
    session_id: uuid.UUID | None = None
    message: Message
    page: Page | None = None


class FeedbackIn(CamelModel):
    rating: ChatFeedback
    reason: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None


class ChatSessionOut(CamelModel):
    id: uuid.UUID
    title: str
    last_message_at: datetime


class ChatMessageOut(CamelModel):
    id: uuid.UUID
    role: ChatRole
    content: str
    citations: list[Any]
    cards: list[Any]
    status: ChatMessageStatus
    feedback: ChatFeedback | None
    created_at: datetime


class ChatSessionDetailOut(ChatSessionOut):
    messages: list[ChatMessageOut]
