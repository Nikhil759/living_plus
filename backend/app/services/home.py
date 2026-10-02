import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth.deps import CurrentMember
from app.models import Flat, Membership, Society
from app.schemas.home import AanganPromptOut, HomeDataOut
from app.services import mappers
from app.services import profile as profile_service


async def load_tower_flat(db: AsyncSession, membership_id: uuid.UUID) -> tuple[str, str]:
    membership = await db.scalar(
        select(Membership)
        .where(Membership.id == membership_id)
        .options(joinedload(Membership.flat).joinedload(Flat.tower))
    )
    if membership is None or membership.flat is None or membership.flat.tower is None:
        return "Your tower", "—"
    return membership.flat.tower.name, membership.flat.flat_no


async def get_home_data(db: AsyncSession, member: CurrentMember) -> HomeDataOut:
    society = await db.get(Society, member.society_id)
    if society is None:
        raise ValueError("Society missing")

    membership = await db.get(Membership, member.membership_id)
    if membership is None:
        raise ValueError("Membership missing")

    tower_name, flat_no = await load_tower_flat(db, member.membership_id)
    profile, created = await profile_service.ensure_profile(db, member)
    if created:
        await db.commit()

    resident = mappers.map_resident(
        member.user,
        society,
        membership,
        tower_name=tower_name,
        flat_no=flat_no,
        profile=profile,
    )

    interests = profile.interests

    return HomeDataOut(
        resident=resident,
        digest=await mappers.map_digest(db, member.society_id, tower_name=tower_name),
        events=await mappers.map_events(db, member.society_id),
        amenities=await mappers.map_amenities(db, member.society_id),
        match=await mappers.map_neighbour_match(
            db,
            society_id=member.society_id,
            user_id=member.user.id,
            interests=interests,
        ),
        prompt=AanganPromptOut(suggestion="When is dry waste collection today?"),
    )
