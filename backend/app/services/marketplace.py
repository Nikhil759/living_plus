import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import (
    Flat,
    ListingReport,
    MarketplaceListing,
    Membership,
    MembershipRole,
    MembershipStatus,
    Tower,
    User,
)
from app.models.enums import ListingCategory, ListingSort, ListingStatus
from app.schemas.marketplace import (
    ListingCardOut,
    ListingDetailOut,
    ListingIn,
    ListingSellerOut,
    SellerProfileOut,
)

_COMMITTEE_ROLES = {MembershipRole.committee.value, MembershipRole.admin.value}
_VISIBLE = (ListingStatus.available, ListingStatus.reserved)
_BROWSE_LIMIT = 200


def is_committee(member: CurrentMember) -> bool:
    return member.role in _COMMITTEE_ROLES


def first_name(user: User) -> str:
    parts = (user.name or "").split()
    return parts[0] if parts else "Neighbour"


def now() -> datetime:
    return datetime.now(UTC)


async def _towers_by_user(
    db: AsyncSession, society_id: uuid.UUID, user_ids: set[uuid.UUID]
) -> dict[uuid.UUID, str]:
    if not user_ids:
        return {}
    rows = await db.execute(
        select(Membership.user_id, Tower.name)
        .join(Flat, Flat.id == Membership.flat_id)
        .join(Tower, Tower.id == Flat.tower_id)
        .where(
            Membership.society_id == society_id,
            Membership.status == MembershipStatus.approved,
            Membership.user_id.in_(user_ids),
        )
    )
    return {user_id: name for user_id, name in rows}


async def _reported_ids(
    db: AsyncSession, member: CurrentMember, listing_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    if not listing_ids or not is_committee(member):
        return set()
    rows = await db.execute(
        select(ListingReport.listing_id)
        .where(ListingReport.society_id == member.society_id)
        .where(ListingReport.listing_id.in_(listing_ids))
        .distinct()
    )
    return set(rows.scalars())


def _card_fields(
    listing: MarketplaceListing, member: CurrentMember, tower: str | None, reported: bool
) -> dict[str, object]:
    return {
        "id": listing.id,
        "title": listing.title,
        "price_inr": listing.price_inr,
        "is_free": listing.price_inr == 0,
        "negotiable": listing.negotiable,
        "condition": listing.condition,
        "category": listing.category,
        "cover_url": listing.photos[0] if listing.photos else None,
        "status": listing.status,
        "tower": tower,
        "listed_at": listing.listed_at,
        "is_mine": listing.seller_id == member.user.id,
        "reported": reported,
    }


async def _to_cards(
    db: AsyncSession, member: CurrentMember, listings: list[MarketplaceListing]
) -> list[ListingCardOut]:
    towers = await _towers_by_user(db, member.society_id, {item.seller_id for item in listings})
    reported = await _reported_ids(db, member, [item.id for item in listings])
    return [
        ListingCardOut(
            **_card_fields(item, member, towers.get(item.seller_id), item.id in reported)
        )
        for item in listings
    ]


def _scoped(member: CurrentMember) -> Select[tuple[MarketplaceListing]]:
    return select(MarketplaceListing).where(MarketplaceListing.society_id == member.society_id)


async def browse(
    db: AsyncSession,
    member: CurrentMember,
    *,
    category: ListingCategory | None,
    free: bool,
    query: str | None,
    sort: ListingSort,
) -> list[ListingCardOut]:
    stmt = _scoped(member).where(MarketplaceListing.status.in_(_VISIBLE))
    if category is not None:
        stmt = stmt.where(MarketplaceListing.category == category)
    if free:
        stmt = stmt.where(MarketplaceListing.price_inr == 0)
    if query and query.strip():
        term = query.strip()
        stmt = stmt.where(
            or_(
                MarketplaceListing.title.icontains(term, autoescape=True),
                MarketplaceListing.description.icontains(term, autoescape=True),
            )
        )
    newest = (MarketplaceListing.listed_at.desc(), MarketplaceListing.created_at.desc())
    if sort == ListingSort.price_asc:
        stmt = stmt.order_by(MarketplaceListing.price_inr.asc(), *newest)
    elif sort == ListingSort.price_desc:
        stmt = stmt.order_by(MarketplaceListing.price_inr.desc(), *newest)
    else:
        stmt = stmt.order_by(*newest)
    result = await db.execute(stmt.limit(_BROWSE_LIMIT))
    return await _to_cards(db, member, list(result.scalars()))


async def _get_listing(
    db: AsyncSession, member: CurrentMember, listing_id: uuid.UUID
) -> MarketplaceListing:
    result = await db.execute(_scoped(member).where(MarketplaceListing.id == listing_id))
    listing = result.scalar_one_or_none()
    if listing is None or listing.status == ListingStatus.removed:
        raise AppError("not_found", "Listing not found.", 404)
    return listing


def _can_manage(member: CurrentMember, listing: MarketplaceListing) -> bool:
    return listing.seller_id == member.user.id or is_committee(member)


async def _detail(
    db: AsyncSession, member: CurrentMember, listing: MarketplaceListing
) -> ListingDetailOut:
    seller = await db.get(User, listing.seller_id)
    if seller is None:
        raise AppError("not_found", "Listing not found.", 404)
    towers = await _towers_by_user(db, member.society_id, {listing.seller_id})
    reported = await _reported_ids(db, member, [listing.id])
    tower = towers.get(listing.seller_id)
    return ListingDetailOut(
        **_card_fields(listing, member, tower, listing.id in reported),
        description=listing.description,
        photos=listing.photos,
        pickup_note=listing.pickup_note,
        contact_method=listing.contact_method,
        seller=ListingSellerOut(
            first_name=first_name(seller), avatar_url=seller.avatar_url, tower=tower
        ),
        can_manage=_can_manage(member, listing),
    )


async def get_listing(
    db: AsyncSession, member: CurrentMember, listing_id: uuid.UUID
) -> ListingDetailOut:
    return await _detail(db, member, await _get_listing(db, member, listing_id))


async def seller_profile(db: AsyncSession, member: CurrentMember) -> SellerProfileOut:
    towers = await _towers_by_user(db, member.society_id, {member.user.id})
    return SellerProfileOut(
        first_name=first_name(member.user),
        avatar_url=member.user.avatar_url,
        tower=towers.get(member.user.id),
        has_phone=bool(member.user.phone),
    )


def _apply_phone(user: User, phone: str | None) -> None:
    if phone:
        user.phone = phone
    if not user.phone:
        raise AppError("phone_required", "Add your phone number so buyers can reach you.", 422)


def _apply_fields(listing: MarketplaceListing, body: ListingIn) -> None:
    listing.title = body.title
    listing.category = body.category
    listing.condition = body.condition
    listing.price_inr = body.price_inr or 0
    listing.negotiable = body.negotiable
    listing.description = body.description or None
    listing.photos = body.photos
    listing.contact_method = body.contact_method
    listing.pickup_note = body.pickup_note


async def create_listing(
    db: AsyncSession, member: CurrentMember, body: ListingIn
) -> ListingDetailOut:
    _apply_phone(member.user, body.phone)
    # society_id and seller always come from the session, never the request body.
    listing = MarketplaceListing(
        id=uuid.uuid4(),
        society_id=member.society_id,
        seller_id=member.user.id,
        listed_at=now(),
        status=ListingStatus.available,
    )
    _apply_fields(listing, body)
    db.add(listing)
    await db.commit()
    return await _detail(db, member, listing)


async def manageable_listing(
    db: AsyncSession, member: CurrentMember, listing_id: uuid.UUID
) -> MarketplaceListing:
    listing = await _get_listing(db, member, listing_id)
    if not _can_manage(member, listing):
        raise AppError("forbidden", "Only the seller can change this listing.", 403)
    return listing


async def update_listing(
    db: AsyncSession, member: CurrentMember, listing_id: uuid.UUID, body: ListingIn
) -> ListingDetailOut:
    listing = await manageable_listing(db, member, listing_id)
    if listing.seller_id == member.user.id:
        _apply_phone(member.user, body.phone)
    _apply_fields(listing, body)
    await db.commit()
    return await _detail(db, member, listing)
