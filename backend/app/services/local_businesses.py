import uuid
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import BusinessRecommendation, LocalBusiness, User
from app.models.enums import (
    BusinessAvailability,
    BusinessCategory,
    BusinessReviewStatus,
    BusinessSort,
)
from app.schemas.local_business import (
    BusinessCardOut,
    BusinessDetailOut,
    BusinessIn,
    BusinessOwnerOut,
    OfferingOut,
    StartingPrice,
)
from app.services import business_social
from app.services.marketplace import apply_phone, first_name, is_committee, towers_by_user

_BROWSE_LIMIT = 200


def _scoped(member: CurrentMember) -> Select[tuple[LocalBusiness]]:
    return select(LocalBusiness).where(
        LocalBusiness.society_id == member.society_id,
        LocalBusiness.review_status != BusinessReviewStatus.removed,
    )


def _starting_price(business: LocalBusiness) -> StartingPrice | None:
    if not business.offerings:
        return None
    cheapest = min(business.offerings, key=lambda offering: offering["price_inr"])
    return StartingPrice(price_inr=cheapest["price_inr"], unit=cheapest["unit"])


async def recommendation_counts(
    db: AsyncSession, business_ids: list[uuid.UUID]
) -> dict[uuid.UUID, int]:
    if not business_ids:
        return {}
    rows = await db.execute(
        select(BusinessRecommendation.business_id, func.count())
        .where(BusinessRecommendation.business_id.in_(business_ids))
        .group_by(BusinessRecommendation.business_id)
    )
    return {business_id: count for business_id, count in rows}


async def _owners(db: AsyncSession, owner_ids: set[uuid.UUID]) -> dict[uuid.UUID, User]:
    if not owner_ids:
        return {}
    rows = await db.execute(select(User).where(User.id.in_(owner_ids)))
    return {user.id: user for user in rows.scalars()}


def _card_fields(
    business: LocalBusiness,
    member: CurrentMember,
    owner: User,
    tower: str | None,
    count: int,
) -> dict[str, Any]:
    return {
        "id": business.id,
        "name": business.name,
        "category": business.category,
        "tagline": business.tagline,
        "cover_url": business.cover_url,
        "owner_first_name": first_name(owner),
        "tower": tower,
        "starting_price": _starting_price(business),
        "recommendation_count": count,
        "availability": business.availability,
        "review_status": business.review_status,
        "is_featured": business.is_featured,
        "is_mine": business.owner_id == member.user.id,
        "created_at": business.created_at,
    }


async def to_cards(
    db: AsyncSession, member: CurrentMember, businesses: list[LocalBusiness]
) -> list[BusinessCardOut]:
    owners = await _owners(db, {item.owner_id for item in businesses})
    towers = await towers_by_user(db, member.society_id, set(owners))
    counts = await recommendation_counts(db, [item.id for item in businesses])
    return [
        BusinessCardOut(
            **_card_fields(
                item,
                member,
                owners[item.owner_id],
                towers.get(item.owner_id),
                counts.get(item.id, 0),
            )
        )
        for item in businesses
    ]


def _matches(business: LocalBusiness, term: str) -> bool:
    haystack = [business.name, business.tagline, business.about or ""]
    haystack += [offering["name"] for offering in business.offerings]
    return any(term in text.casefold() for text in haystack)


async def browse(
    db: AsyncSession,
    member: CurrentMember,
    *,
    category: BusinessCategory | None,
    taking_orders: bool,
    query: str | None,
    sort: BusinessSort,
) -> list[BusinessCardOut]:
    stmt = _scoped(member).where(LocalBusiness.review_status == BusinessReviewStatus.approved)
    if category is not None:
        stmt = stmt.where(LocalBusiness.category == category)
    if taking_orders:
        stmt = stmt.where(LocalBusiness.availability == BusinessAvailability.taking_orders)
    result = await db.execute(stmt.order_by(LocalBusiness.created_at.desc()).limit(_BROWSE_LIMIT))
    businesses = list(result.scalars())
    term = (query or "").strip().casefold()
    if term:
        # Offerings live in a JSON column, so match them in Python (the list is small).
        businesses = [item for item in businesses if _matches(item, term)]
    cards = await to_cards(db, member, businesses)
    if sort == BusinessSort.recommended:
        # Python's sort is stable, so ties keep the newest-first order.
        cards.sort(key=lambda card: card.recommendation_count, reverse=True)
    return cards


async def get_business(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> LocalBusiness:
    result = await db.execute(_scoped(member).where(LocalBusiness.id == business_id))
    business = result.scalar_one_or_none()
    visible = business is not None and (
        business.review_status == BusinessReviewStatus.approved
        or business.owner_id == member.user.id
        or is_committee(member)
    )
    if business is None or not visible:
        raise AppError("not_found", "Business not found.", 404)
    return business


async def owned_business(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> LocalBusiness:
    business = await get_business(db, member, business_id)
    if business.owner_id != member.user.id:
        raise AppError("forbidden", "Only the owner can change this business.", 403)
    return business


async def detail(
    db: AsyncSession, member: CurrentMember, business: LocalBusiness
) -> BusinessDetailOut:
    [card] = await to_cards(db, member, [business])
    owner = (await _owners(db, {business.owner_id}))[business.owner_id]
    is_owner = business.owner_id == member.user.id
    return BusinessDetailOut(
        **card.model_dump(),
        about=business.about,
        photos=business.photos,
        offerings=[OfferingOut(**offering) for offering in business.offerings],
        timings=business.timings,
        days=business.days,
        serves=business.serves,
        contact_method=business.contact_method,
        owner=BusinessOwnerOut(
            first_name=first_name(owner),
            avatar_url=owner.avatar_url,
            tower=card.tower,
            member_since=owner.created_at.year,
        ),
        latest_update=await business_social.latest_update(db, business.id),
        recommendations=await business_social.recent_recommendations(db, member, business.id),
        viewer=await business_social.viewer_state(db, member, business.id),
        follower_count=(
            await business_social.follower_count(db, business)
            if is_owner or is_committee(member)
            else None
        ),
        can_manage=is_owner,
        rejection_reason=business.rejection_reason if is_owner or is_committee(member) else None,
        can_review=is_committee(member) and business.review_status == BusinessReviewStatus.pending,
    )


async def get_detail(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID
) -> BusinessDetailOut:
    return await detail(db, member, await get_business(db, member, business_id))


def _apply_fields(business: LocalBusiness, body: BusinessIn) -> None:
    business.name = body.name
    business.category = body.category
    business.tagline = body.tagline
    business.about = body.about or None
    business.cover_url = body.cover_url
    business.photos = body.photos
    business.offerings = [offering.model_dump(mode="json") for offering in body.offerings]
    business.timings = body.timings
    business.days = [day.value for day in body.days]
    business.serves = body.serves
    business.contact_method = body.contact_method


async def create_business(
    db: AsyncSession, member: CurrentMember, body: BusinessIn
) -> BusinessDetailOut:
    apply_phone(member.user, body.phone)
    # society_id and owner always come from the session, never the request body.
    business = LocalBusiness(
        id=uuid.uuid4(),
        society_id=member.society_id,
        owner_id=member.user.id,
        availability=BusinessAvailability.taking_orders,
        review_status=BusinessReviewStatus.pending,
    )
    _apply_fields(business, body)
    db.add(business)
    await db.commit()
    return await detail(db, member, business)


async def update_business(
    db: AsyncSession, member: CurrentMember, business_id: uuid.UUID, body: BusinessIn
) -> BusinessDetailOut:
    business = await owned_business(db, member, business_id)
    apply_phone(member.user, body.phone)
    _apply_fields(business, body)
    if business.review_status == BusinessReviewStatus.rejected:
        # Fixing a rejected listing sends it back to the committee.
        business.review_status = BusinessReviewStatus.pending
        business.rejection_reason = None
    await db.commit()
    return await detail(db, member, business)


async def set_availability(
    db: AsyncSession,
    member: CurrentMember,
    business_id: uuid.UUID,
    availability: BusinessAvailability,
) -> BusinessDetailOut:
    business = await owned_business(db, member, business_id)
    business.availability = availability
    await db.commit()
    return await detail(db, member, business)


async def my_businesses(db: AsyncSession, member: CurrentMember) -> list[BusinessCardOut]:
    result = await db.execute(
        _scoped(member)
        .where(LocalBusiness.owner_id == member.user.id)
        .order_by(LocalBusiness.created_at.desc())
    )
    return await to_cards(db, member, list(result.scalars()))
