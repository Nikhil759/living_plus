import uuid

from fastapi import APIRouter, Query, Response

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models.enums import (
    OpeningBudget,
    OpeningFurnishing,
    OpeningKind,
    OpeningSort,
)
from app.schemas.flat_opening import (
    OpeningCardOut,
    OpeningDetailOut,
    OpeningIn,
    OpeningOptionsOut,
    OpeningRemoveIn,
)
from app.schemas.marketplace import ContactOut
from app.services import flat_openings as opening_service

router = APIRouter(prefix="/flat-openings", tags=["flat-openings"])


@router.get("/options", response_model=OpeningOptionsOut)
async def options(db: DbSession, member: CurrentMemberDep) -> OpeningOptionsOut:
    return await opening_service.options(db, member)


@router.get("", response_model=list[OpeningCardOut])
async def browse_openings(
    db: DbSession,
    member: CurrentMemberDep,
    kind: OpeningKind | None = None,
    bhk: int | None = Query(default=None, ge=1, le=4),
    budget: OpeningBudget | None = None,
    furnishing: OpeningFurnishing | None = None,
    sort: OpeningSort = OpeningSort.newest,
) -> list[OpeningCardOut]:
    return await opening_service.browse(
        db, member, kind=kind, bhk=bhk, budget=budget, furnishing=furnishing, sort=sort
    )


@router.post("", response_model=OpeningDetailOut, status_code=201)
async def create_opening(
    body: OpeningIn, db: DbSession, member: CurrentMemberDep
) -> OpeningDetailOut:
    return await opening_service.create_opening(db, member, body)


@router.get("/{opening_id}", response_model=OpeningDetailOut)
async def get_opening(
    opening_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> OpeningDetailOut:
    return await opening_service.detail(db, member, opening_id)


@router.put("/{opening_id}", response_model=OpeningDetailOut)
async def update_opening(
    opening_id: uuid.UUID, body: OpeningIn, db: DbSession, member: CurrentMemberDep
) -> OpeningDetailOut:
    return await opening_service.update_opening(db, member, opening_id, body)


@router.post("/{opening_id}/fill", response_model=OpeningDetailOut)
async def mark_filled(
    opening_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> OpeningDetailOut:
    return await opening_service.mark_filled(db, member, opening_id)


@router.post("/{opening_id}/renew", response_model=OpeningDetailOut)
async def renew_opening(
    opening_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> OpeningDetailOut:
    return await opening_service.renew(db, member, opening_id)


@router.post("/{opening_id}/remove", status_code=204)
async def remove_opening(
    opening_id: uuid.UUID, body: OpeningRemoveIn, db: DbSession, member: CurrentMemberDep
) -> Response:
    await opening_service.remove(db, member, opening_id, body.reason)
    return Response(status_code=204)


@router.post("/{opening_id}/contact", response_model=ContactOut)
async def contact_poster(
    opening_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> ContactOut:
    return await opening_service.contact_poster(db, member, opening_id)
