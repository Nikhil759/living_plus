from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.home import ResidentOut
from app.schemas.identity import ProfileUpdate
from app.services import profile as profile_service

router = APIRouter(tags=["me"])


@router.get("/me", response_model=ResidentOut)
async def get_me(db: DbSession, member: CurrentMemberDep) -> ResidentOut:
    return await profile_service.build_resident_out(db, member)


@router.patch("/me", response_model=ResidentOut)
async def patch_me(
    body: ProfileUpdate,
    db: DbSession,
    member: CurrentMemberDep,
) -> ResidentOut:
    return await profile_service.update_profile(db, member, body)
