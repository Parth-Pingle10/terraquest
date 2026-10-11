from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.db.mongo import mongo_manager

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health", summary="Basic liveness probe")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@router.get("/ready", summary="Readiness probe (verifies database connectivity)")
async def readiness_check(response: Response):
    is_db_ready = await mongo_manager.ping()
    if not is_db_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "database": "unreachable",
            "message": "MongoDB is not responding to ping.",
        }

    return {
        "status": "ready",
        "database": "connected",
        "app": settings.APP_NAME,
    }
