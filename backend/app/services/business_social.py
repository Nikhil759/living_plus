"""Read-side helpers for what neighbours say and do around a business."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.models import (
    BusinessFollow,
    BusinessRecommendation,
    BusinessUpdate,
    LocalBusiness,
    Profile,
    User,
)
from app.schemas.local_business import BusinessViewerOut, LatestUpdateOut, RecommendationOut
from app.services.marketplace import first_name, towers_by_user

_SHOWN_NOTES = 3


async def latest_update(db: AsyncSession, business_id: uuid.UUID) -> LatestUpdateOut | None:
    result = await db.execute(
        select(BusinessUpdate)
        .where(BusinessUpdate.business_id == business_id)
        .order_by(BusinessUpdate.created_at.desc())
        .limit(1)
    )
    update = result.scalar_one_or_none()
    return LatestUpdateOut(text=update.text, created_at=update.created_at) if update else None


async def recent_recommendations(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> list[RecommendationOut]:
    result = await db.execute(
        select(BusinessRecommendation, User)
        .join(User, User.id == BusinessRecommendation.user_id)
        .join(Profile, Profile.user_id == BusinessRecommendation.user_id)
        .where(
            BusinessRecommendation.business_id == business_id,
            BusinessRecommendation.society_id == member.society_id,
            BusinessRecommendation.note.is_not(None),
            BusinessRecommendation.note_removed_reason.is_(None),
            Profile.is_visible.is_(True),
        )
        .order_by(BusinessRecommendation.created_at.desc())
        .limit(_SHOWN_NOTES)
    )
    rows = result.all()
    towers = await towers_by_user(db, member.society_id, {user.id for _rec, user in rows})
    return [
        RecommendationOut(
            id=rec.id,
            first_name=first_name(user),
            tower=towers.get(user.id),
            note=rec.note or "",
            created_at=rec.created_at,
        )
        for rec, user in rows
    ]


async def viewer_state(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> BusinessViewerOut:
    following = await db.scalar(
        select(BusinessFollow.id).where(
            BusinessFollow.business_id == business_id,
            BusinessFollow.user_id == member.user.id,
        )
    )
    result = await db.execute(
        select(BusinessRecommendation).where(
            BusinessRecommendation.business_id == business_id,
            BusinessRecommendation.user_id == member.user.id,
        )
    )
    mine = result.scalar_one_or_none()
    note = mine.note if mine and mine.note_removed_reason is None else None
    return BusinessViewerOut(
        following=following is not None, recommended=mine is not None, my_note=note
    )


async def follower_count(db: AsyncSession, business: LocalBusiness) -> int:
    count = await db.scalar(
        select(func.count())
        .select_from(BusinessFollow)
        .where(BusinessFollow.business_id == business.id)
    )
    return int(count or 0)
