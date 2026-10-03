import uuid

from fastapi import APIRouter, Query

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
)
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
