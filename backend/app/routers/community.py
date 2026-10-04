import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.community import (
    CatalogOut,
    FeedPostOut,
    GroupDetailOut,
    GroupIn,
    GroupOut,
    JoinRequestOut,
    PostIn,
    WhatsappGroupOut,
)
from app.services import community

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/catalog", response_model=CatalogOut)
async def get_catalog(db: DbSession, member: CurrentMemberDep) -> CatalogOut:
    return await community.catalog(db, member)


@router.get("/feed", response_model=list[FeedPostOut])
async def get_feed(
    db: DbSession,
    member: CurrentMemberDep,
    group_id: Annotated[uuid.UUID | None, Query(alias="groupId")] = None,
) -> list[FeedPostOut]:
    return await community.feed(db, member, group_id)


@router.post("/posts", response_model=FeedPostOut, status_code=201)
async def create_post(body: PostIn, db: DbSession, member: CurrentMemberDep) -> FeedPostOut:
    return await community.create_post(db, member, body)


@router.post("/groups", response_model=GroupOut, status_code=201)
async def create_group(body: GroupIn, db: DbSession, member: CurrentMemberDep) -> GroupOut:
    return await community.create_group(db, member, body)


@router.get("/groups/{group_id}", response_model=GroupDetailOut)
async def get_group(group_id: uuid.UUID, db: DbSession, member: CurrentMemberDep) -> GroupDetailOut:
    return await community.get_group(db, member, group_id)


@router.post("/groups/{group_id}/join", response_model=GroupOut)
async def join_group(group_id: uuid.UUID, db: DbSession, member: CurrentMemberDep) -> GroupOut:
    return await community.join_group(db, member, group_id)


@router.delete("/groups/{group_id}/membership", response_model=GroupOut)
async def leave_group(group_id: uuid.UUID, db: DbSession, member: CurrentMemberDep) -> GroupOut:
    return await community.leave_group(db, member, group_id)


@router.post("/whatsapp/{whatsapp_id}/request", response_model=WhatsappGroupOut)
async def request_whatsapp(
    whatsapp_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> WhatsappGroupOut:
    return await community.request_whatsapp(db, member, whatsapp_id)


@router.get("/join-requests", response_model=list[JoinRequestOut])
async def pending_requests(db: DbSession, member: CurrentMemberDep) -> list[JoinRequestOut]:
    return await community.pending_requests(db, member)


@router.post("/join-requests/{request_id}/approve", status_code=204)
async def approve_request(
    request_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> Response:
    await community.decide_request(db, member, request_id, approve=True)
    return Response(status_code=204)


@router.post("/join-requests/{request_id}/reject", status_code=204)
async def reject_request(
    request_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> Response:
    await community.decide_request(db, member, request_id, approve=False)
    return Response(status_code=204)
