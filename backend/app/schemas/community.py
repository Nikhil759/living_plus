import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.models.enums import JoinTargetType, PostType
from app.schemas.base import CamelModel

Visibility = Literal["public", "private"]


class PostIn(CamelModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=1000)]
    post_type: PostType = PostType.general
    group_id: uuid.UUID | None = None


class GroupIn(CamelModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=60)]
    emoji: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8)] = (
        "👥"
    )
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=3, max_length=300)
    ]
    visibility: Visibility = "public"
    tags: list[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
    ] = Field(default_factory=list, max_length=8)


class GroupOut(CamelModel):
    id: uuid.UUID
    name: str
    emoji: str
    member_count: int
    description: str
    visibility: Visibility
    tags: list[str]
    joined: bool
    is_admin: bool
    pending: bool
    suggested: bool


class WhatsappGroupOut(CamelModel):
    id: uuid.UUID
    name: str
    member_count: int
    topic: str | None
    # Only present once the group admin has approved this resident's request.
    invite_link: str | None
    pending_approval: bool
    is_admin: bool


class NeighbourOut(CamelModel):
    id: str
    first_name: str
    tower: str
    interests: list[str]
    avatar_url: str | None


class CatalogOut(CamelModel):
    groups: list[GroupOut]
    whatsapp_groups: list[WhatsappGroupOut]
    neighbours: list[NeighbourOut]


class FeedPostOut(CamelModel):
    id: uuid.UUID
    author_name: str
    author_avatar_url: str | None
    author_meta: str
    group_id: uuid.UUID | None
    group_name: str | None
    post_type: PostType
    pinned: bool
    body: str
    posted_at: datetime
    comment_count: int
    reaction_count: int


class GroupDetailOut(GroupOut):
    posts: list[FeedPostOut]


class JoinRequestOut(CamelModel):
    id: uuid.UUID
    target_type: JoinTargetType
    target_id: uuid.UUID
    target_name: str
    requester_name: str
    created_at: datetime
