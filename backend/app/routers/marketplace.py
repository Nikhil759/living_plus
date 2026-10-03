import uuid

from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models.enums import ListingCategory, ListingSort
from app.schemas.marketplace import (
    ListingCardOut,
    ListingDetailOut,
    ListingIn,
    SellerProfileOut,
)
from app.services import marketplace as marketplace_service

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/seller-profile", response_model=SellerProfileOut)
async def seller_profile(db: DbSession, member: CurrentMemberDep) -> SellerProfileOut:
    return await marketplace_service.seller_profile(db, member)


@router.get("/listings", response_model=list[ListingCardOut])
async def browse_listings(
    db: DbSession,
    member: CurrentMemberDep,
    category: ListingCategory | None = None,
    free: bool = False,
    q: str | None = None,
    sort: ListingSort = ListingSort.newest,
) -> list[ListingCardOut]:
    return await marketplace_service.browse(
        db, member, category=category, free=free, query=q, sort=sort
    )


@router.post("/listings", response_model=ListingDetailOut, status_code=201)
async def create_listing(
    body: ListingIn, db: DbSession, member: CurrentMemberDep
) -> ListingDetailOut:
    return await marketplace_service.create_listing(db, member, body)


@router.get("/listings/{listing_id}", response_model=ListingDetailOut)
async def get_listing(
    listing_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ListingDetailOut:
    return await marketplace_service.get_listing(db, member, listing_id)


@router.put("/listings/{listing_id}", response_model=ListingDetailOut)
async def update_listing(
    listing_id: uuid.UUID, body: ListingIn, db: DbSession, member: CurrentMemberDep
) -> ListingDetailOut:
    return await marketplace_service.update_listing(db, member, listing_id, body)
