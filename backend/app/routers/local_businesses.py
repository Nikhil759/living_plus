import uuid

from fastapi import APIRouter, Response

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models.enums import BusinessCategory, BusinessSort
from app.schemas.local_business import (
    BusinessAvailabilityIn,
    BusinessCardOut,
    BusinessDetailOut,
    BusinessIn,
    FeaturedIn,
    ReasonIn,
    RecommendIn,
    ReviewIn,
    UpdateIn,
)
from app.schemas.marketplace import ContactOut
from app.services import business_engagement, business_review
from app.services import local_businesses as business_service

router = APIRouter(prefix="/local-businesses", tags=["local-businesses"])


@router.get("", response_model=list[BusinessCardOut])
async def browse_businesses(
    db: DbSession,
    member: CurrentMemberDep,
    category: BusinessCategory | None = None,
    taking_orders: bool = False,
    q: str | None = None,
    sort: BusinessSort = BusinessSort.recommended,
) -> list[BusinessCardOut]:
    return await business_service.browse(
        db, member, category=category, taking_orders=taking_orders, query=q, sort=sort
    )


@router.post("", response_model=BusinessDetailOut, status_code=201)
async def create_business(
    body: BusinessIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_service.create_business(db, member, body)


@router.get("/mine", response_model=list[BusinessCardOut])
async def my_businesses(db: DbSession, member: CurrentMemberDep) -> list[BusinessCardOut]:
    return await business_service.my_businesses(db, member)


@router.get("/pending", response_model=list[BusinessCardOut])
async def pending_businesses(db: DbSession, member: CurrentMemberDep) -> list[BusinessCardOut]:
    return await business_review.pending(db, member)


@router.get("/{business_id}", response_model=BusinessDetailOut)
async def get_business(
    business_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_service.get_detail(db, member, business_id)


@router.put("/{business_id}", response_model=BusinessDetailOut)
async def update_business(
    business_id: uuid.UUID, body: BusinessIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_service.update_business(db, member, business_id, body)


@router.patch("/{business_id}/availability", response_model=BusinessDetailOut)
async def set_availability(
    business_id: uuid.UUID,
    body: BusinessAvailabilityIn,
    db: DbSession,
    member: CurrentMemberDep,
) -> BusinessDetailOut:
    return await business_service.set_availability(db, member, business_id, body.availability)


@router.post("/{business_id}/follow", response_model=BusinessDetailOut)
async def follow_business(
    business_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_engagement.follow(db, member, business_id)


@router.delete("/{business_id}/follow", response_model=BusinessDetailOut)
async def unfollow_business(
    business_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_engagement.unfollow(db, member, business_id)


@router.post("/{business_id}/recommendation", response_model=BusinessDetailOut, status_code=201)
async def recommend_business(
    business_id: uuid.UUID, body: RecommendIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_engagement.recommend(db, member, business_id, body.note)


@router.delete("/{business_id}/recommendation", response_model=BusinessDetailOut)
async def withdraw_recommendation(
    business_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_engagement.withdraw_recommendation(db, member, business_id)


@router.post("/{business_id}/updates", response_model=BusinessDetailOut, status_code=201)
async def post_update(
    business_id: uuid.UUID, body: UpdateIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_engagement.post_update(db, member, business_id, body.text)


@router.patch("/{business_id}/featured", response_model=BusinessDetailOut)
async def set_featured(
    business_id: uuid.UUID, body: FeaturedIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_engagement.set_featured(db, member, business_id, body.featured)


@router.post("/{business_id}/contact", response_model=ContactOut)
async def contact_owner(
    business_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ContactOut:
    return await business_engagement.contact(db, member, business_id)


@router.post("/{business_id}/review", response_model=BusinessDetailOut)
async def review_business(
    business_id: uuid.UUID, body: ReviewIn, db: DbSession, member: CurrentMemberDep
) -> BusinessDetailOut:
    return await business_review.review(
        db, member, business_id, approve=body.decision == "approve", reason=body.reason
    )


@router.post("/{business_id}/remove", status_code=204)
async def remove_business(
    business_id: uuid.UUID, body: ReasonIn, db: DbSession, member: CurrentMemberDep
) -> Response:
    await business_review.remove_business(db, member, business_id, body.reason)
    return Response(status_code=204)


@router.post(
    "/{business_id}/recommendations/{recommendation_id}/remove-note",
    response_model=BusinessDetailOut,
)
async def remove_recommendation_note(
    business_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    body: ReasonIn,
    db: DbSession,
    member: CurrentMemberDep,
) -> BusinessDetailOut:
    return await business_review.remove_note(
        db, member, business_id, recommendation_id, body.reason
    )
