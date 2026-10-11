from fastapi import APIRouter
from app.api.v1 import (
    ai_router,
    discoveries_router,
    exploration_router,
    health_router,
    maps_router,
    quests_router,
    sharing_router,
    skills_router,
    sync_router,
    users_router,
)

api_v1_router = APIRouter(prefix="/api/v1")

# Mount v1 routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(maps_router)
api_v1_router.include_router(discoveries_router)
api_v1_router.include_router(quests_router)
api_v1_router.include_router(skills_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(sharing_router)
api_v1_router.include_router(exploration_router)
api_v1_router.include_router(sync_router)
