from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user, get_sync_service
from app.models.user import UserModel
from app.schemas.common import ResponseEnvelope
from app.schemas.sync import (
    SyncDiscoveriesRequest,
    SyncDiscoveriesResponse,
    SyncExplorationRequest,
    SyncExplorationResponse,
)
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["Offline & Local-First Sync"])


@router.post(
    "/discoveries",
    response_model=ResponseEnvelope[SyncDiscoveriesResponse],
    summary="Synchronize client-local discoveries to the server (Idempotent)",
)
async def sync_discoveries(
    data: SyncDiscoveriesRequest,
    current_user: UserModel = Depends(get_current_user),
    sync_service: SyncService = Depends(get_sync_service),
):
    result = await sync_service.sync_discoveries(current_user.id, data.discoveries)
    return ResponseEnvelope(data=result)


@router.post(
    "/exploration",
    response_model=ResponseEnvelope[SyncExplorationResponse],
    summary="Synchronize client-local explored cells to the server (Idempotent)",
)
async def sync_exploration(
    data: SyncExplorationRequest,
    current_user: UserModel = Depends(get_current_user),
    sync_service: SyncService = Depends(get_sync_service),
):
    result = await sync_service.sync_exploration(current_user.id, data.cells)
    return ResponseEnvelope(data=result)
