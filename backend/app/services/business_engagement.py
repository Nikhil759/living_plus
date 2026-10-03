"""Follow, recommend, post updates, feature and contact: what residents do with a business."""

import uuid
from urllib.parse import quote

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import BusinessFollow, BusinessRecommendation, BusinessUpdate, LocalBusiness, User
from app.models.enums import BusinessReviewStatus, ListingContactMethod
from app.schemas.local_business import BusinessDetailOut
from app.schemas.marketplace import ContactOut
from app.services import local_businesses as business_service
from app.services.marketplace import first_name, phone_digits, towers_by_user
from app.services.notifications import add_notifications

MAX_FEATURED = 4
# Demo unlocks featuring for every owner. Flip off to require Plus.
_PLUS_UNLOCKED = True


async def _approved(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> LocalBusiness:
    business = await business_service.get_business(db, member, business_id)
    if business.review_status != BusinessReviewStatus.approved:
        raise AppError("not_approved", "This business isn't listed yet.", 409)
    return business


async def follow(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> BusinessDetailOut:
    business = await _approved(db, member, business_id)
    existing = await db.scalar(
        select(BusinessFollow.id).where(
            BusinessFollow.business_id == business.id, BusinessFollow.user_id == member.user.id
        )
    )
    if existing is None:  # following twice is a no-op
        db.add(
            BusinessFollow(
                id=uuid.uuid4(),
                business_id=business.id,
                society_id=member.society_id,
                user_id=member.user.id,
            )
        )
        await db.commit()
    return await business_service.detail(db, member, business)


async def unfollow(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> BusinessDetailOut:
    business = await business_service.get_business(db, member, business_id)
    result = await db.execute(
        select(BusinessFollow).where(
            BusinessFollow.business_id == business.id, BusinessFollow.user_id == member.user.id
        )
    )
    for row in result.scalars():
        await db.delete(row)
    await db.commit()
    return await business_service.detail(db, member, business)


async def _my_recommendation(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> BusinessRecommendation | None:
    result = await db.execute(
        select(BusinessRecommendation).where(
            BusinessRecommendation.business_id == business_id,
            BusinessRecommendation.user_id == member.user.id,
        )
    )
    return result.scalar_one_or_none()


async def recommend(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID, note: str | None
) -> BusinessDetailOut:
    business = await _approved(db, member, business_id)
    if business.owner_id == member.user.id:
        raise AppError("own_business", "You can't recommend your own business.", 403)
    if await _my_recommendation(db, member, business.id) is not None:
        raise AppError("already_recommended", "You've already recommended this business.", 409)
    db.add(
        BusinessRecommendation(
            id=uuid.uuid4(),
            business_id=business.id,
            society_id=member.society_id,
            user_id=member.user.id,
            note=note or None,
        )
    )
    await db.commit()
    return await business_service.detail(db, member, business)


async def withdraw_recommendation(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> BusinessDetailOut:
    business = await business_service.get_business(db, member, business_id)
    mine = await _my_recommendation(db, member, business.id)
    if mine is not None:
        await db.delete(mine)
        await db.commit()
    return await business_service.detail(db, member, business)


async def post_update(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID, text: str
) -> BusinessDetailOut:
    business = await business_service.owned_business(db, member, business_id)
    if business.review_status != BusinessReviewStatus.approved:
        raise AppError("not_approved", "You can post updates once the committee approves.", 409)
    db.add(
        BusinessUpdate(
            id=uuid.uuid4(), business_id=business.id, society_id=member.society_id, text=text
        )
    )
    followers = await db.execute(
        select(BusinessFollow.user_id).where(BusinessFollow.business_id == business.id)
    )
    add_notifications(
        db,
        member.society_id,
        [user_id for user_id in followers.scalars() if user_id != member.user.id],
        kind="business_update",
        title=business.name,
        body=text,
        href=f"/local-businesses/{business.id}",
    )
    await db.commit()
    return await business_service.detail(db, member, business)


async def set_featured(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID, featured: bool
) -> BusinessDetailOut:
    business = await business_service.owned_business(db, member, business_id)
    if business.review_status != BusinessReviewStatus.approved:
        raise AppError("not_approved", "Only listed businesses can be featured.", 409)
    if featured and not business.is_featured:
        if not _PLUS_UNLOCKED:
            raise AppError("plus_required", "Featuring is a Living+ Plus feature.", 403)
        count = await db.scalar(
            select(func.count())
            .select_from(LocalBusiness)
            .where(
                LocalBusiness.society_id == member.society_id,
                LocalBusiness.review_status == BusinessReviewStatus.approved,
                LocalBusiness.is_featured.is_(True),
            )
        )
        if (count or 0) >= MAX_FEATURED:
            raise AppError(
                "featured_limit",
                f"Only {MAX_FEATURED} businesses can be featured at a time.",
                409,
            )
    business.is_featured = featured
    await db.commit()
    return await business_service.detail(db, member, business)


async def contact(db: AsyncSession, member: CurrentMember, business_id: uuid.UUID) -> ContactOut:
    """The owner's number only ever leaves the server inside this on-demand link."""
    business = await _approved(db, member, business_id)
    if business.owner_id == member.user.id:
        raise AppError("own_business", "This is your own business.", 422)
    owner = await db.get(User, business.owner_id)
    if owner is None or not owner.phone:
        raise AppError("owner_unreachable", "The owner can't be reached right now.", 409)
    digits = phone_digits(owner.phone)
    if business.contact_method == ListingContactMethod.call:
        return ContactOut(method=business.contact_method, url=f"tel:+{digits}")
    towers = await towers_by_user(db, member.society_id, {member.user.id})
    tower = towers.get(member.user.id)
    me = f"{first_name(member.user)} from {tower}" if tower else first_name(member.user)
    text = (
        f"Hi {first_name(owner)}, I'm {me}. I found {business.name} on Living+ "
        "and wanted to ask about…"
    )
    return ContactOut(
        method=business.contact_method, url=f"https://wa.me/{digits}?text={quote(text)}"
    )
