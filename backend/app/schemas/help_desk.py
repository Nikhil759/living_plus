import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import StringConstraints, model_validator

from app.models.enums import (
    ActorRole,
    FeedbackTopic,
    TicketCategory,
    TicketScope,
    TicketStatus,
    TicketUpdateKind,
    TicketUrgency,
    VendorCategory,
)
from app.schemas.base import CamelModel


def _text(min_length: int, max_length: int) -> StringConstraints:
    return StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)


Title = Annotated[str, _text(3, 80)]
Description = Annotated[str, _text(3, 500)]
AreaLabel = Annotated[str, _text(1, 60)]
Message = Annotated[str, _text(1, 500)]
Note = Annotated[str, _text(1, 300)]
FeedbackMessage = Annotated[str, _text(5, 1000)]


class IssueIn(CamelModel):
    category: TicketCategory
    scope: TicketScope
    # Ignored for my_flat issues: those always belong to the resident's own tower.
    tower_id: uuid.UUID | None = None
    area_label: AreaLabel | None = None
    title: Title
    description: Description
    urgency: TicketUrgency = TicketUrgency.normal

    @model_validator(mode="after")
    def common_area_needs_tower(self) -> Self:
        if self.scope == TicketScope.common_area and self.tower_id is None:
            raise ValueError("towerId is required for common-area issues")
        return self


class CommentIn(CamelModel):
    message: Message


class ConfirmationIn(CamelModel):
    fixed: bool
    note: Note | None = None


class StatusIn(CamelModel):
    status: TicketStatus
    note: Note | None = None
    vendor_id: uuid.UUID | None = None


class FeedbackIn(CamelModel):
    topic: FeedbackTopic
    message: FeedbackMessage
    anonymous: bool = False


class TimelineEntryOut(CamelModel):
    id: uuid.UUID
    kind: TicketUpdateKind
    at: datetime
    actor_name: str
    actor_role: ActorRole
    message: str


class IssueOut(CamelModel):
    id: uuid.UUID
    number: str
    title: str
    description: str
    category: TicketCategory
    scope: TicketScope
    tower: str
    tower_id: uuid.UUID
    area_label: str | None
    urgency: TicketUrgency
    status: TicketStatus
    created_at: datetime
    reporter_ids: list[str]
    # Kept for the frontend type; emails are never exposed.
    reporter_emails: list[str]
    follower_ids: list[str]
    reporter_count: int
    photo_urls: list[str]
    assigned_vendor_id: uuid.UUID | None
    timeline: list[TimelineEntryOut]
    awaiting_confirmation: bool


class VendorOut(CamelModel):
    id: uuid.UUID
    name: str
    category: VendorCategory
    emoji: str
    phone: str | None
    whatsapp: str | None
    note: str | None
    hours_label: str | None
    society_approved: bool


class FeedbackOut(CamelModel):
    id: uuid.UUID
    topic: FeedbackTopic
    message: str
    anonymous: bool
    author_name: str | None
    created_at: datetime
    read: bool
