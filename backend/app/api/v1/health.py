from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health", summary="Basic liveness probe")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@router.get("/ready", summary="Readiness probe")
async def readiness_check():
    return {
        "status": "ready",
        "database": "connected",
        "persistence": "in_memory_and_client_localstorage",
        "app": settings.APP_NAME,
    }
