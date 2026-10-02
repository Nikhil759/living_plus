import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.auth.jwt import decode_supabase_access_token
from app.core.config import get_settings
from app.core.db import DbSession
from app.core.errors import AppError
from app.models import Flat, Membership, User
from app.models.enums import MembershipStatus

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentMember:
    user: User
    society_id: uuid.UUID
    role: str
    flat_id: uuid.UUID | None
    membership_id: uuid.UUID


def _email_from_claims(claims: dict[str, object]) -> str | None:
    email = claims.get("email")
    return email if isinstance(email, str) else None


def _name_from_claims(claims: dict[str, object]) -> str | None:
    meta = claims.get("user_metadata")
    if isinstance(meta, dict):
        name = meta.get("full_name") or meta.get("name")
        if isinstance(name, str):
            return name
    name = claims.get("name")
    return name if isinstance(name, str) else None


def _avatar_from_claims(claims: dict[str, object]) -> str | None:
    meta = claims.get("user_metadata")
    if isinstance(meta, dict):
        avatar = meta.get("avatar_url") or meta.get("picture")
        if isinstance(avatar, str) and avatar:
            return avatar
    picture = claims.get("picture")
    return picture if isinstance(picture, str) and picture else None


def _apply_claims_to_user(user: User, claims: dict[str, object]) -> bool:
    changed = False
    name = _name_from_claims(claims)
    if name and user.name != name:
        user.name = name
        changed = True
    avatar = _avatar_from_claims(claims)
    if avatar and user.avatar_url != avatar:
        user.avatar_url = avatar
        changed = True
    return changed


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    settings = get_settings()
    claims: dict[str, object] | None = None

    if credentials is not None:
        claims = decode_supabase_access_token(credentials.credentials)
    elif settings.ENV == "local" and settings.LOCAL_DEV_AUTH_EMAIL:
        # Lets the Next.js app call the API before Supabase login is wired in the UI.
        result = await db.execute(
            select(User).where(User.email == settings.LOCAL_DEV_AUTH_EMAIL)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise AppError(
                "dev_user_missing",
                "LOCAL_DEV_AUTH_EMAIL user not found. Run the seed.",
                503,
            )
        return user

    if claims is None:
        raise AppError("unauthorised", "Missing access token.", 401)

    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        raise AppError("invalid_token", "Token is missing subject.", 401)

    result = await db.execute(select(User).where(User.supabase_uid == sub))
    user = result.scalar_one_or_none()
    if user is None:
        email = _email_from_claims(claims)
        if not email:
            raise AppError("invalid_token", "Token is missing email.", 401)
        user = User(
            supabase_uid=sub,
            email=email,
            name=_name_from_claims(claims),
            avatar_url=_avatar_from_claims(claims),
        )
        db.add(user)
        await db.flush()
    elif _apply_claims_to_user(user, claims):
        await db.flush()
    return user


async def get_current_member(
    user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> CurrentMember:
    result = await db.execute(
        select(Membership)
        .where(
            Membership.user_id == user.id,
            Membership.status == MembershipStatus.approved,
        )
        .options(joinedload(Membership.flat).joinedload(Flat.tower))
        .limit(1)
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise AppError("not_a_member", "No approved society membership.", 403)

    return CurrentMember(
        user=user,
        society_id=membership.society_id,
        role=membership.role.value,
        flat_id=membership.flat_id,
        membership_id=membership.id,
    )


CurrentMemberDep = Annotated[CurrentMember, Depends(get_current_member)]
