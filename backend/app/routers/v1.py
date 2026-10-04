from fastapi import APIRouter

from app.routers import (
    amenities,
    announcements,
    events,
    flat_openings,
    health,
    home,
    invites,
    local_businesses,
    marketplace,
    me,
    notifications,
    saarthi,
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
api_router.include_router(flat_openings.router)
api_router.include_router(local_businesses.router)
api_router.include_router(marketplace.router)
api_router.include_router(notifications.router)
api_router.include_router(announcements.router)
api_router.include_router(uploads.router)
api_router.include_router(saarthi.router)
