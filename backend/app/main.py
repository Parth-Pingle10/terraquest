from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_v1_router
from app.api.v1.health import router as health_root_router
from app.core.config import settings
from app.core.exceptions import (
    TerraQuestException,
    generic_exception_handler,
    terraquest_exception_handler,
)
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and graceful shutdown."""
    logger.info(
        "Starting %s v%s in %s environment (In-Memory / Local-First mode)...",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.APP_ENV,
    )
    # Seed in-memory starter quests if empty
    try:
        from app.ai.deterministic_provider import CURATED_DETERMINISTIC_QUESTS
        from app.db.memory_store import get_db
        from app.models.quest import QuestModel
        from app.repositories.quest_repository import QuestRepository

        db = get_db()
        quest_repo = QuestRepository(db)
        if await quest_repo.count() == 0:
            for template in CURATED_DETERMINISTIC_QUESTS:
                quest_model = QuestModel(
                    title=template["title"],
                    description=template["description"],
                    skill_category=template["skill_category"],
                    duration_minutes=template["duration_minutes"],
                    difficulty=template["difficulty"],
                    instructions=template["instructions"],
                    reflection_questions=template["reflection_questions"],
                    completion_criteria=template["completion_criteria"],
                    optional_follow_up_prompt=template.get("optional_follow_up_prompt"),
                    generation_source="seed",
                    active=True,
                )
                await quest_repo.create(quest_model)
            logger.info("Auto-seeded %d curated starter quests into in-memory store.", len(CURATED_DETERMINISTIC_QUESTS))
    except Exception as e:
        logger.warning("Notice during in-memory startup initialization: %s", str(e))

    yield
    logger.info("Shutting down %s...", settings.APP_NAME)


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

    # Built frontend static file & SPA fallback serving (Render single-container deployment)
    dist_path: Optional[Path] = None
    if settings.FRONTEND_DIST_DIR:
        candidate = Path(settings.FRONTEND_DIST_DIR).resolve()
        if candidate.is_dir() and (candidate / "index.html").is_file():
            dist_path = candidate
    else:
        for p in [
            Path("/app/frontend/dist"),
            Path("/app/dist"),
            Path(__file__).parent.parent.parent / "frontend" / "dist",
        ]:
            if p.is_dir() and (p / "index.html").is_file():
                dist_path = p.resolve()
                break

    if dist_path:
        assets_dir = dist_path / "assets"
        if assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa_frontend(full_path: str):
            # Guard API, health, docs, and schema routes from SPA catch-all
            if (
                full_path.startswith("api/")
                or full_path == "api"
                or full_path.startswith("health")
                or full_path in ("docs", "redoc", "openapi.json")
            ):
                return JSONResponse(status_code=404, content={"detail": "Not Found"})

            target_file = dist_path / full_path
            if full_path and target_file.is_file():
                return FileResponse(target_file)
            return FileResponse(dist_path / "index.html")

        logger.info("Serving built frontend SPA from %s", str(dist_path))

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.APP_DEBUG)
