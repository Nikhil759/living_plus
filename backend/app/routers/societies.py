from fastapi import APIRouter, Query

from app.core.db import DbSession
from app.core.errors import AppError
from app.schemas.society_lookup import SocietyLookupOut
from app.services import society_lookup as lookup_service

router = APIRouter(prefix="/societies", tags=["societies"])


@router.get("/lookup", response_model=SocietyLookupOut)
async def lookup_society_by_invite(
    db: DbSession,
    code: str = Query(min_length=4, max_length=32),
) -> SocietyLookupOut:
    match = await lookup_service.lookup_invite_code(db, code)
    if match is None:
        raise AppError("invalid_invite", "Invite code not found.", 404)
    return match
