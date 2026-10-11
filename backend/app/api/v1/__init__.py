"""API v1 routers."""

from app.api.v1.ai import router as ai_router
from app.api.v1.discoveries import router as discoveries_router
from app.api.v1.exploration import router as exploration_router
from app.api.v1.health import router as health_router
from app.api.v1.maps import router as maps_router
from app.api.v1.quests import router as quests_router
from app.api.v1.sharing import router as sharing_router
from app.api.v1.skills import router as skills_router
from app.api.v1.sync import router as sync_router
from app.api.v1.users import router as users_router

__all__ = [
    "ai_router",
    "discoveries_router",
    "exploration_router",
    "health_router",
    "maps_router",
    "quests_router",
    "sharing_router",
    "skills_router",
    "sync_router",
    "users_router",
]
