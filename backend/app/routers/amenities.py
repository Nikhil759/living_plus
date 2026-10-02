from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.home import AmenityOut
from app.services import mappers

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.get("", response_model=list[AmenityOut])
async def list_amenities(db: DbSession, member: CurrentMemberDep) -> list[AmenityOut]:
    return await mappers.map_amenities(db, member.society_id)

