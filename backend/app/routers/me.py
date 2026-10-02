from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.models import Membership, Society
from app.schemas.home import ResidentOut
from app.services import home as home_service
from app.services import mappers

router = APIRouter(tags=["me"])


@router.get("/me", response_model=ResidentOut)
async def get_me(db: DbSession, member: CurrentMemberDep) -> ResidentOut:
    society = await db.get(Society, member.society_id)
    membership = await db.get(Membership, member.membership_id)
    if society is None or membership is None:
        raise ValueError("Missing membership context")
    tower_name, flat_no = await home_service.load_tower_flat(db, member.membership_id)
    return mappers.map_resident(
        member.user,
        society,
        membership,
        tower_name=tower_name,
        flat_no=flat_no,
    )
