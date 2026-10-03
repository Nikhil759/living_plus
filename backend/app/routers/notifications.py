from fastapi import APIRouter, Response

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.notification import NotificationOut
from app.services import notifications as notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(db: DbSession, member: CurrentMemberDep) -> list[NotificationOut]:
    return await notification_service.list_notifications(db, member)


@router.post("/read-all", status_code=204)
async def read_all(db: DbSession, member: CurrentMemberDep) -> Response:
    await notification_service.mark_all_read(db, member)
    return Response(status_code=204)
