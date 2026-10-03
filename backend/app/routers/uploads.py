from fastapi import APIRouter, UploadFile
from fastapi.responses import FileResponse

from app.auth import CurrentMemberDep
from app.schemas.base import CamelModel
from app.services import uploads as upload_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


class UploadOut(CamelModel):
    url: str


@router.post("/event-covers", response_model=UploadOut)
async def upload_event_cover(_member: CurrentMemberDep, file: UploadFile) -> UploadOut:
    url = await upload_service.save_event_cover(file)
    return UploadOut(url=url)


@router.post("/listing-photos", response_model=UploadOut)
async def upload_listing_photo(_member: CurrentMemberDep, file: UploadFile) -> UploadOut:
    return UploadOut(url=await upload_service.save_listing_photo(file))


@router.get("/listing-photos/{filename}")
async def get_listing_photo(filename: str) -> FileResponse:
    return FileResponse(upload_service.listing_photo_path(filename))


@router.get("/event-covers/{filename}")
async def get_event_cover(filename: str) -> FileResponse:
    path = upload_service.event_cover_path(filename)
    return FileResponse(path)
