import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.models.enums import MembershipRole, MembershipStatus, SocietyPlan
from app.schemas.base import CamelModel


class UserRead(CamelModel):
    id: uuid.UUID
    supabase_uid: str
    email: EmailStr
    phone: str | None
    name: str | None
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime


class UserCreate(CamelModel):
    supabase_uid: str = Field(min_length=1, max_length=128)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    name: str | None = Field(default=None, max_length=200)
    avatar_url: str | None = Field(default=None, max_length=2048)


class SocietyRead(CamelModel):
    id: uuid.UUID
    name: str
    city: str
    address: str | None
    invite_code: str
    plan: SocietyPlan
    settings: dict[str, object]
    created_at: datetime
    updated_at: datetime


class SocietyCreate(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    address: str | None = None
    invite_code: str = Field(min_length=4, max_length=32)
    plan: SocietyPlan = SocietyPlan.free
    settings: dict[str, object] = Field(default_factory=dict)


class TowerRead(CamelModel):
    id: uuid.UUID
    society_id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime


class TowerCreate(CamelModel):
    name: str = Field(min_length=1, max_length=50)


class FlatRead(CamelModel):
    id: uuid.UUID
    society_id: uuid.UUID
    tower_id: uuid.UUID
    flat_no: str
    created_at: datetime
    updated_at: datetime


class FlatCreate(CamelModel):
    tower_id: uuid.UUID
    flat_no: str = Field(min_length=1, max_length=20)


class MembershipRead(CamelModel):
    id: uuid.UUID
    user_id: uuid.UUID
    society_id: uuid.UUID
    flat_id: uuid.UUID | None
    role: MembershipRole
    status: MembershipStatus
    created_at: datetime
    updated_at: datetime


class MembershipCreate(CamelModel):
    user_id: uuid.UUID
    flat_id: uuid.UUID | None = None
    role: MembershipRole = MembershipRole.tenant
    status: MembershipStatus = MembershipStatus.pending


class ProfileRead(CamelModel):
    user_id: uuid.UUID
    society_id: uuid.UUID
    bio: str | None
    interests: list[str]
    is_visible: bool
    show_flat: bool
    created_at: datetime
    updated_at: datetime


class ProfileCreate(CamelModel):
    society_id: uuid.UUID
    bio: str | None = Field(default=None, max_length=2000)
    interests: list[str] = Field(default_factory=list)
    is_visible: bool = False
    show_flat: bool = False


class ProfileUpdate(CamelModel):
    bio: str | None = Field(default=None, max_length=2000)
    interests: list[str] | None = None
    is_visible: bool | None = None
    show_flat: bool | None = None
