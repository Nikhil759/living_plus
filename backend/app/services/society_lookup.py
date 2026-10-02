from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import Flat, Membership, MembershipInvite
from app.models.enums import MembershipInviteStatus, MembershipStatus
from app.schemas.society_lookup import SocietyLookupOut
from app.services.invites import is_master_invite_code, normalize_invite_code


async def lookup_invite_code(db: AsyncSession, code: str) -> SocietyLookupOut | None:
    normalized = normalize_invite_code(code)
    filters = [MembershipInvite.code == normalized]
    if not is_master_invite_code(normalized):
        filters.append(MembershipInvite.status == MembershipInviteStatus.pending)
    result = await db.execute(
        select(MembershipInvite)
        .where(*filters)
        .options(joinedload(MembershipInvite.society))
    )
    invite = result.scalar_one_or_none()
    if invite is None or invite.society is None:
        return None

    society = invite.society
    homes = await db.scalar(
        select(func.count()).select_from(Flat).where(Flat.society_id == society.id)
    )
    members = await db.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.society_id == society.id,
            Membership.status == MembershipStatus.approved,
        )
    )

    return SocietyLookupOut(
        name=society.name,
        city=society.city,
        homes=homes,
        members=members,
    )
