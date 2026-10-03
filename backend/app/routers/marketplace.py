import uuid

from fastapi import APIRouter, Response

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models.enums import ListingCategory, ListingSort, ListingTab
from app.schemas.marketplace import (
    ContactOut,
    ListingCardOut,
    ListingDetailOut,
    ListingIn,
    ListingReasonIn,
    ListingRemoveIn,
    ListingStatusIn,
    ReportOut,
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


@router.get("/listings/mine", response_model=list[ListingCardOut])
async def my_listings(
    db: DbSession, member: CurrentMemberDep, tab: ListingTab = ListingTab.active
) -> list[ListingCardOut]:
    return await marketplace_service.my_listings(db, member, tab)


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


@router.patch("/listings/{listing_id}/status", response_model=ListingDetailOut)
async def set_status(
    listing_id: uuid.UUID, body: ListingStatusIn, db: DbSession, member: CurrentMemberDep
) -> ListingDetailOut:
    return await marketplace_service.set_status(db, member, listing_id, body.status)


@router.post("/listings/{listing_id}/remove", status_code=204)
async def remove_listing(
    listing_id: uuid.UUID, body: ListingRemoveIn, db: DbSession, member: CurrentMemberDep
) -> Response:
    await marketplace_service.remove_listing(db, member, listing_id, body.reason)
    return Response(status_code=204)


@router.post("/listings/{listing_id}/report", response_model=ReportOut, status_code=201)
async def report_listing(
    listing_id: uuid.UUID, body: ListingReasonIn, db: DbSession, member: CurrentMemberDep
) -> ReportOut:
    return await marketplace_service.report_listing(db, member, listing_id, body.reason)


@router.post("/listings/{listing_id}/contact", response_model=ContactOut)
async def contact_seller(
    listing_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ContactOut:
    return await marketplace_service.contact_seller(db, member, listing_id)
