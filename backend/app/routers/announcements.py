from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.home import DigestItemOut
from app.services import mappers

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=list[DigestItemOut])
async def list_announcements(db: DbSession, member: CurrentMemberDep) -> list[DigestItemOut]:
    digest = await mappers.map_digest(db, member.society_id, tower_name="your society")
    return digest.items if digest else []
