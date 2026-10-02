from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.home import HomeDataOut
from app.services import home as home_service

router = APIRouter(tags=["home"])


@router.get("/home", response_model=HomeDataOut)
async def get_home(db: DbSession, member: CurrentMemberDep) -> HomeDataOut:
    return await home_service.get_home_data(db, member)
