"""Committee tools: approve or reject listings, take down businesses and recommendation notes."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import BusinessRecommendation, LocalBusiness
from app.models.enums import BusinessReviewStatus
from app.schemas.local_business import BusinessCardOut, BusinessDetailOut
from app.services import local_businesses as business_service
from app.services.marketplace import is_committee
from app.services.notifications import add_notifications


def require_committee(member: CurrentMember) -> None:
    if not is_committee(member):
        raise AppError("forbidden", "Only the committee can do this.", 403)


async def pending(db: AsyncSession, member: CurrentMember) -> list[BusinessCardOut]:
    require_committee(member)
    result = await db.execute(
        select(LocalBusiness)
        .where(
            LocalBusiness.society_id == member.society_id,
            LocalBusiness.review_status == BusinessReviewStatus.pending,
        )
        .order_by(LocalBusiness.created_at.asc())
    )
    return await business_service.to_cards(db, member, list(result.scalars()))


async def review(
    db: AsyncSession,
    member: CurrentMember,
    business_id: uuid.UUID,
    *,
    approve: bool,
    reason: str | None,
) -> BusinessDetailOut:
    require_committee(member)
    business = await business_service.get_business(db, member, business_id)
    if business.review_status != BusinessReviewStatus.pending:
        raise AppError("not_pending", "This business has already been reviewed.", 409)
    business.review_status = (
        BusinessReviewStatus.approved if approve else BusinessReviewStatus.rejected
    )
    business.rejection_reason = None if approve else reason
    add_notifications(
        db,
        member.society_id,
        [business.owner_id],
        kind="business_review",
        title=f"{business.name} is live" if approve else f"{business.name} needs changes",
        body="Neighbours can now find it in Local businesses." if approve else (reason or ""),
        href=f"/local-businesses/{business.id}",
    )
    await db.commit()
    return await business_service.detail(db, member, business)


async def remove_business(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID, reason: str
) -> None:
    require_committee(member)
    business = await business_service.get_business(db, member, business_id)
    business.review_status = BusinessReviewStatus.removed
    business.removed_reason = reason
    business.is_featured = False
    add_notifications(
        db,
        member.society_id,
        [business.owner_id],
        kind="business_removed",
        title=f"{business.name} was removed",
        body=reason,
    )
    await db.commit()


async def remove_note(
    db: AsyncSession,
    member: CurrentMember,
    business_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    reason: str,
) -> BusinessDetailOut:
    require_committee(member)
    business = await business_service.get_business(db, member, business_id)
    result = await db.execute(
        select(BusinessRecommendation).where(
            BusinessRecommendation.id == recommendation_id,
            BusinessRecommendation.business_id == business.id,
            BusinessRecommendation.society_id == member.society_id,
        )
    )
    recommendation = result.scalar_one_or_none()
    if recommendation is None:
        raise AppError("not_found", "Recommendation not found.", 404)
    # The recommendation still counts; only its written note comes down.
    recommendation.note_removed_reason = reason
    await db.commit()
    return await business_service.detail(db, member, business)
