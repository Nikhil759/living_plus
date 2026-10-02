from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import Flat, Membership, MembershipInvite, Profile, User
from app.models.enums import MembershipInviteStatus, MembershipStatus
from app.schemas.invite import RedeemInviteOut

# Invites with this email accept any signed-in Google account (one-time demo / guest codes).
OPEN_INVITE_EMAIL = "*"


def normalize_invite_code(code: str) -> str:
    return code.strip().upper().replace(" ", "")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def is_open_invite(email: str) -> bool:
    return normalize_email(email) == OPEN_INVITE_EMAIL


def is_master_invite_code(code: str) -> bool:
    master = get_settings().MASTER_INVITE_CODE.strip().upper()
    if not master:
        return False
    return normalize_invite_code(code) == master


def _utc_now_naive() -> datetime:
    """Postgres columns on membership_invites use timestamp without time zone."""
    return datetime.now(UTC).replace(tzinfo=None)


async def redeem_invite(
    db: AsyncSession,
    user: User,
    invite_code: str,
) -> RedeemInviteOut:
    code = normalize_invite_code(invite_code)
    result = await db.execute(
        select(MembershipInvite)
        .where(MembershipInvite.code == code)
        .options(
            joinedload(MembershipInvite.society),
            joinedload(MembershipInvite.flat).joinedload(Flat.tower),
        )
    )
    invite = result.scalar_one_or_none()
    if invite is None:
        raise AppError("invalid_invite", "Invite code not found.", 404)

    master = is_master_invite_code(code)
    if invite.status != MembershipInviteStatus.pending and not master:
        raise AppError("invite_used", "This invite code has already been used or revoked.", 409)

    now = _utc_now_naive()
    if not master and invite.expires_at is not None and invite.expires_at < now:
        invite.status = MembershipInviteStatus.expired
        raise AppError("invite_expired", "This invite code has expired.", 410)

    if (
        not is_open_invite(invite.email)
        and normalize_email(user.email) != normalize_email(invite.email)
    ):
        raise AppError(
            "email_mismatch",
            "This invite is tied to a different email. "
            "Sign in with the email your society registered.",
            403,
        )

    existing = await db.execute(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.society_id == invite.society_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise AppError("already_member", "You are already a member of this society.", 409)

    membership = Membership(
        user_id=user.id,
        society_id=invite.society_id,
        flat_id=invite.flat_id,
        role=invite.role,
        status=MembershipStatus.approved,
    )
    db.add(membership)

    profile = await db.get(Profile, user.id)
    if profile is None:
        db.add(
            Profile(
                user_id=user.id,
                society_id=invite.society_id,
                bio=None,
                interests=[],
            )
        )

    if not master:
        invite.status = MembershipInviteStatus.consumed
        invite.consumed_at = now
        invite.consumed_by_user_id = user.id
        if is_open_invite(invite.email):
            invite.email = normalize_email(user.email)

    await db.commit()

    flat = invite.flat
    tower = flat.tower if flat is not None else None
    society = invite.society
    if flat is None or tower is None or society is None:
        raise AppError("invalid_invite", "Invite is missing flat or society data.", 500)

    return RedeemInviteOut(
        society_name=society.name,
        tower_name=tower.name,
        flat_no=flat.flat_no,
        role=invite.role.value,
    )
