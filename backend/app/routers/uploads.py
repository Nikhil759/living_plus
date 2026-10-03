from fastapi import APIRouter, UploadFile
from fastapi.responses import FileResponse

from app.auth import CurrentMemberDep
from app.schemas.base import CamelModel
from app.services import uploads as upload_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


class EventCoverUploadOut(CamelModel):
    url: str


@router.post("/event-covers", response_model=EventCoverUploadOut)
async def upload_event_cover(_member: CurrentMemberDep, file: UploadFile) -> EventCoverUploadOut:
    url = await upload_service.save_event_cover(file)
    return EventCoverUploadOut(url=url)


@router.get("/event-covers/{filename}")
async def get_event_cover(filename: str) -> FileResponse:
    path = upload_service.event_cover_path(filename)
    return FileResponse(path)
