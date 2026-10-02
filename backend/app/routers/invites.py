from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.core.db import DbSession
from app.models import User
from app.schemas.invite import RedeemInviteIn, RedeemInviteOut
from app.services import invites as invite_service

router = APIRouter(prefix="/invites", tags=["invites"])

CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post("/redeem", response_model=RedeemInviteOut)
async def redeem_invite(
    body: RedeemInviteIn,
    db: DbSession,
    user: CurrentUserDep,
) -> RedeemInviteOut:
    return await invite_service.redeem_invite(db, user, body.invite_code)
