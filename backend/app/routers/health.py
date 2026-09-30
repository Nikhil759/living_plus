from fastapi import APIRouter

from app.core.db import DbSession
from app.schemas.health import HealthResponse
from app.services import health as health_service

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def get_health(db: DbSession) -> HealthResponse:
    return HealthResponse(status="ok", db=await health_service.check_database(db))
