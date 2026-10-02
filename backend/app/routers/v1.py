from fastapi import APIRouter

from app.routers import amenities, announcements, events, health, home, me

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)
api_router.include_router(me.router)
api_router.include_router(home.router)
api_router.include_router(events.router)
api_router.include_router(amenities.router)
api_router.include_router(announcements.router)
