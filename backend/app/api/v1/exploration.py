from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_current_user, get_exploration_service
from app.models.user import UserModel
from app.schemas.common import ResponseEnvelope
from app.services.exploration_service import ExplorationService

router = APIRouter(prefix="/exploration", tags=["Exploration Statistics"])


@router.get(
    "/summary",
    response_model=ResponseEnvelope[Dict[str, Any]],
    summary="Get user aggregate exploration metrics",
)
async def get_summary(
    current_user: UserModel = Depends(get_current_user),
    exploration_service: ExplorationService = Depends(get_exploration_service),
):
    summary_data = await exploration_service.get_summary(current_user.id)
    return ResponseEnvelope(data=summary_data)


@router.get(
    "/timeline",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="Get chronological timeline of exploration events",
)
async def get_timeline(
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    exploration_service: ExplorationService = Depends(get_exploration_service),
):
    timeline = await exploration_service.get_timeline(current_user.id, limit=limit)
    return ResponseEnvelope(data=timeline)


@router.get(
    "/heatmap",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="Get visited coordinates and exploration weights for fog-of-war rendering",
)
async def get_heatmap(
    map_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: UserModel = Depends(get_current_user),
    exploration_service: ExplorationService = Depends(get_exploration_service),
):
    points = await exploration_service.get_heatmap(current_user.id, map_id=map_id, limit=limit)
    return ResponseEnvelope(data=points)
