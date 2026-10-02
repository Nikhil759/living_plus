from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel


class PersonOut(CamelModel):
    id: str
    name: str
    avatar_url: str | None = None


class ResidentOut(CamelModel):
    id: str
    name: str
    avatar_url: str | None = None
    society: str
    tower: str
    flat: str
    roles: list[str]
    has_unread_notifications: bool = False
    bio: str | None = None
    interests: list[str] = Field(default_factory=list)
    is_visible: bool = False
    show_flat: bool = False


class HomeEventOut(CamelModel):
    id: str
    title: str
    host: str
    host_icon: Literal["person", "celebration", "club"]
    starts_at: str
    location: str
    price_inr: int
    image_url: str | None = None
    image_alt: str | None = None
    glyph: Literal["ride", "game", "music", "wellness", "general"]
    going_count: int
    action_label: str
    action_tone: Literal["solid", "soft"]
    href: str


class AmenityOut(CamelModel):
    id: str
    name: str
    emoji: str
    status: Literal["free", "open", "quiet", "moderate", "booked"]
    detail: str


class DigestItemOut(CamelModel):
    id: str
    emoji: str
    lead: str
    body: str


class DigestOut(CamelModel):
    title: str
    subtitle: str
    items: list[DigestItemOut]
    total_count: int


class NeighbourMatchOut(CamelModel):
    label: str
    title: str
    description: str
    people: list[PersonOut]
    total_count: int
    active_summary: str
    action_label: str


class AanganPromptOut(CamelModel):
    suggestion: str


class HomeDataOut(CamelModel):
    resident: ResidentOut
    digest: DigestOut | None
    events: list[HomeEventOut]
    amenities: list[AmenityOut]
    match: NeighbourMatchOut | None
    prompt: AanganPromptOut = Field(
        default_factory=lambda: AanganPromptOut(suggestion="Ask Aangan anything")
    )
