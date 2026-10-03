import uuid
from datetime import datetime, timedelta

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import (
    Flat,
    FlatOpening,
    Membership,
    MembershipStatus,
    Tower,
    User,
)
from app.models.enums import (
    OpeningBudget,
    OpeningFurnishing,
    OpeningKind,
    OpeningSort,
    OpeningStatus,
)
from app.schemas.flat_opening import (
    OpeningCardOut,
    OpeningDetailOut,
    OpeningIn,
    OpeningOptionsOut,
    OpeningPosterOut,
    OpeningState,
    TowerOut,
    today_ist,
)
from app.services.marketplace import apply_phone, first_name, is_committee, now, towers_by_user

LISTING_DAYS = 30
RENEW_WINDOW = timedelta(days=3)
_BROWSE_LIMIT = 100


def opening_title(kind: OpeningKind, bhk: int, tower: str) -> str:
    size = f"{bhk}{'+' if bhk >= 4 else ''} BHK"
    if kind == OpeningKind.room_available:
        return f"Room in {size} · {tower}"
    if kind == OpeningKind.flatmate_needed:
        return f"Flatmate for {size} · {tower}"
    return f"Entire {size} · {tower}"


def opening_state(opening: FlatOpening, at: datetime) -> OpeningState:
    if opening.status == OpeningStatus.filled:
        return "filled"
    return "expired" if opening.expires_at <= at else "active"


def _scoped(member: CurrentMember) -> Select[tuple[FlatOpening]]:
    return select(FlatOpening).where(FlatOpening.society_id == member.society_id)


async def _viewer_tower(db: AsyncSession, member: CurrentMember) -> Tower | None:
    result = await db.execute(
        select(Tower)
        .join(Flat, Flat.tower_id == Tower.id)
        .join(Membership, Membership.flat_id == Flat.id)
        .where(
            Membership.user_id == member.user.id,
            Membership.society_id == member.society_id,
            Membership.status == MembershipStatus.approved,
        )
    )
    return result.scalars().first()


async def options(db: AsyncSession, member: CurrentMember) -> OpeningOptionsOut:
    towers = await db.execute(
        select(Tower).where(Tower.society_id == member.society_id).order_by(Tower.name)
    )
    mine = await _viewer_tower(db, member)
    return OpeningOptionsOut(
        first_name=first_name(member.user),
        tower_id=mine.id if mine else None,
        towers=[TowerOut(id=tower.id, name=tower.name) for tower in towers.scalars()],
        has_phone=bool(member.user.phone),
    )


async def _tower_names(db: AsyncSession, tower_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
    rows = await db.execute(select(Tower.id, Tower.name).where(Tower.id.in_(tower_ids)))
    return {tower_id: name for tower_id, name in rows}


async def _posters(db: AsyncSession, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, User]:
    rows = await db.execute(select(User).where(User.id.in_(user_ids)))
    return {user.id: user for user in rows.scalars()}


def _card_fields(
    opening: FlatOpening, member: CurrentMember, tower: str, poster: User, at: datetime
) -> dict[str, object]:
    # A date already past reads as "Available now".
    upcoming = opening.available_from and opening.available_from > today_ist()
    return {
        "id": opening.id,
        "kind": opening.kind,
        "title": opening_title(opening.kind, opening.bhk, tower),
        "rent_inr": opening.rent_inr,
        "bhk": opening.bhk,
        "tower": tower,
        "floor": opening.floor,
        "furnishing": opening.furnishing,
        "available_from": opening.available_from if upcoming else None,
        "preference": opening.preference,
        "description": opening.description,
        "posted_by": first_name(poster),
        "posted_at": opening.listed_at,
        "is_mine": opening.poster_id == member.user.id,
        "state": opening_state(opening, at),
    }


async def _to_cards(
    db: AsyncSession, member: CurrentMember, openings: list[FlatOpening]
) -> list[OpeningCardOut]:
    towers = await _tower_names(db, {item.tower_id for item in openings})
    posters = await _posters(db, {item.poster_id for item in openings})
    at = now()
    return [
        OpeningCardOut(
            **_card_fields(item, member, towers[item.tower_id], posters[item.poster_id], at)
        )
        for item in openings
    ]


_BUDGET_BOUNDS: dict[OpeningBudget, tuple[int, int | None]] = {
    OpeningBudget.under_20k: (0, 19_999),
    OpeningBudget.from_20k_to_40k: (20_000, 40_000),
    OpeningBudget.over_40k: (40_001, None),
}


async def browse(
    db: AsyncSession,
    member: CurrentMember,
    *,
    kind: OpeningKind | None,
    bhk: int | None,
    budget: OpeningBudget | None,
    furnishing: OpeningFurnishing | None,
    sort: OpeningSort,
) -> list[OpeningCardOut]:
    """Active, unexpired listings of the viewer's society."""
    stmt = _scoped(member).where(
        FlatOpening.status == OpeningStatus.active, FlatOpening.expires_at > now()
    )
    if kind is not None:
        stmt = stmt.where(FlatOpening.kind == kind)
    if bhk is not None:
        stmt = stmt.where(FlatOpening.bhk == bhk)
    if furnishing is not None:
        stmt = stmt.where(FlatOpening.furnishing == furnishing)
    if budget is not None:
        low, high = _BUDGET_BOUNDS[budget]
        stmt = stmt.where(FlatOpening.rent_inr >= low)
        if high is not None:
            stmt = stmt.where(FlatOpening.rent_inr <= high)
    newest = (FlatOpening.listed_at.desc(), FlatOpening.created_at.desc())
    if sort == OpeningSort.rent_asc:
        stmt = stmt.order_by(FlatOpening.rent_inr.asc(), *newest)
    else:
        stmt = stmt.order_by(*newest)
    result = await db.execute(stmt.limit(_BROWSE_LIMIT))
    return await _to_cards(db, member, list(result.scalars()))


async def get_opening(
    db: AsyncSession, member: CurrentMember, opening_id: uuid.UUID
) -> FlatOpening:
    result = await db.execute(_scoped(member).where(FlatOpening.id == opening_id))
    opening = result.scalar_one_or_none()
    if opening is None or opening.status == OpeningStatus.removed:
        raise AppError("not_found", "Opening not found.", 404)
    return opening


def _can_renew(opening: FlatOpening, at: datetime) -> bool:
    return opening.status == OpeningStatus.active and opening.expires_at - at <= RENEW_WINDOW


async def _detail(
    db: AsyncSession, member: CurrentMember, opening: FlatOpening
) -> OpeningDetailOut:
    towers = await _tower_names(db, {opening.tower_id})
    poster = await db.get(User, opening.poster_id)
    if poster is None:
        raise AppError("not_found", "Opening not found.", 404)
    poster_towers = await towers_by_user(db, member.society_id, {poster.id})
    at = now()
    mine = opening.poster_id == member.user.id
    return OpeningDetailOut(
        **_card_fields(opening, member, towers[opening.tower_id], poster, at),
        tower_id=opening.tower_id,
        deposit_inr=opening.deposit_inr,
        maintenance_included=opening.maintenance_included,
        maintenance_inr=opening.maintenance_inr,
        included=opening.included,
        contact_method=opening.contact_method,
        poster=OpeningPosterOut(
            first_name=first_name(poster),
            tower=poster_towers.get(poster.id, towers[opening.tower_id]),
        ),
        can_remove=mine or is_committee(member),
        expires_at=opening.expires_at if mine else None,
        can_renew=mine and _can_renew(opening, at),
    )


async def detail(
    db: AsyncSession, member: CurrentMember, opening_id: uuid.UUID
) -> OpeningDetailOut:
    return await _detail(db, member, await get_opening(db, member, opening_id))


async def _check_tower(db: AsyncSession, member: CurrentMember, tower_id: uuid.UUID) -> None:
    found = await db.scalar(
        select(Tower.id).where(Tower.id == tower_id, Tower.society_id == member.society_id)
    )
    if found is None:
        raise AppError("invalid_tower", "Choose a tower in your society.", 422)


def _apply_fields(opening: FlatOpening, body: OpeningIn) -> None:
    opening.tower_id = body.tower_id
    opening.kind, opening.bhk, opening.floor = body.kind, body.bhk, body.floor
    opening.furnishing = body.furnishing
    opening.rent_inr, opening.deposit_inr = body.rent_inr, body.deposit_inr
    opening.maintenance_included = body.maintenance_included
    opening.maintenance_inr = body.maintenance_inr
    opening.available_from = body.available_from
    opening.preference = body.preference
    opening.included = [item.value for item in body.included]
    opening.description = body.description
    opening.contact_method = body.contact_method


async def create_opening(
    db: AsyncSession, member: CurrentMember, body: OpeningIn
) -> OpeningDetailOut:
    await _check_tower(db, member, body.tower_id)
    apply_phone(member.user, body.phone)
    at = now()
    # society_id and the poster always come from the session, never the request body.
    opening = FlatOpening(
        id=uuid.uuid4(),
        society_id=member.society_id,
        poster_id=member.user.id,
        status=OpeningStatus.active,
        listed_at=at,
        expires_at=at + timedelta(days=LISTING_DAYS),
    )
    _apply_fields(opening, body)
    db.add(opening)
    await db.commit()
    return await _detail(db, member, opening)


async def own_opening(
    db: AsyncSession, member: CurrentMember, opening_id: uuid.UUID
) -> FlatOpening:
    opening = await get_opening(db, member, opening_id)
    if opening.poster_id != member.user.id:
        raise AppError("forbidden", "Only the poster can change this opening.", 403)
    return opening


async def update_opening(
    db: AsyncSession, member: CurrentMember, opening_id: uuid.UUID, body: OpeningIn
) -> OpeningDetailOut:
    opening = await own_opening(db, member, opening_id)
    if opening.status == OpeningStatus.filled:
        raise AppError("opening_closed", "A filled opening can't be edited.", 409)
    await _check_tower(db, member, body.tower_id)
    apply_phone(member.user, body.phone)
    _apply_fields(opening, body)
    await db.commit()
    return await _detail(db, member, opening)
