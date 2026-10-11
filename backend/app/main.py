from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_v1_router
from app.api.v1.health import router as health_root_router
from app.core.config import settings
from app.core.exceptions import (
    TerraQuestException,
    generic_exception_handler,
    terraquest_exception_handler,
)
from app.core.logging import logger
from app.db.indexes import create_indexes
from app.db.mongo import mongo_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialize database and indexes on startup; disconnect on shutdown."""
    logger.info("Starting %s v%s in %s environment...", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV)
    try:
        await mongo_manager.connect()
        db = mongo_manager.get_database()
        await create_indexes(db)
        logger.info("Application initialized successfully.")
    except Exception as e:
        logger.warning("Notice during startup database initialization: %s", str(e))

    yield

    logger.info("Shutting down %s...", settings.APP_NAME)
    await mongo_manager.disconnect()


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Mobile-first, local-AI-powered real-world exploration platform for Hacktoberfest 'Touch Grass'. "
            "Privacy-conscious: local memories stay private by default, shared maps are revocable and sanitized."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    # Note: Wildcard '*' is NEVER combined with allow_credentials in production
    allow_all_origins = "*" in settings.CORS_ORIGINS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS if not allow_all_origins else ["*"],
        allow_credentials=not allow_all_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Exception Handlers
    app.add_exception_handler(TerraQuestException, terraquest_exception_handler)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request parameters or payload.",
                    "details": exc.errors(),
                },
            },
        )

    app.add_exception_handler(Exception, generic_exception_handler)

    # Root probes for container orchestrators
    app.include_router(health_root_router)

    # Versioned API routes
    app.include_router(api_v1_router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.APP_DEBUG)
