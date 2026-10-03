from fastapi import APIRouter

from app.routers import (
    amenities,
    announcements,
    events,
    health,
    home,
    invites,
    me,
    societies,
    uploads,
)

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)
api_router.include_router(societies.router)
api_router.include_router(invites.router)
api_router.include_router(me.router)
api_router.include_router(home.router)
api_router.include_router(events.router)
api_router.include_router(amenities.router)
api_router.include_router(announcements.router)
api_router.include_router(uploads.router)
