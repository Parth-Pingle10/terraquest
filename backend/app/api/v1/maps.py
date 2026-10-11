from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.dependencies import (
    get_current_user,
    get_current_user_optional,
    get_map_service,
)
from app.models.user import UserModel
from app.schemas.common import MessageResponse, ResponseEnvelope
from app.schemas.map import (
    CheckInRequest,
    CheckInResponse,
    ExplorationCellResponse,
    MapCreateRequest,
    MapResponse,
    MapStatisticsResponse,
    MapUpdateRequest,
)
from app.services.map_service import MapService
from app.utils.pagination import PaginatedResponse

router = APIRouter(prefix="/maps", tags=["Maps & Exploration Cells"])


@router.post(
    "",
    response_model=ResponseEnvelope[MapResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new exploration map",
)
async def create_map(
    data: MapCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    map_service: MapService = Depends(get_map_service),
):
    result = await map_service.create_map(current_user.id, data)
    return ResponseEnvelope(data=result)


@router.get(
    "",
    response_model=ResponseEnvelope[PaginatedResponse[MapResponse]],
    summary="List all exploration maps owned by current user",
)
async def list_user_maps(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    map_service: MapService = Depends(get_map_service),
):
    skip = (page - 1) * limit
    items, total = await map_service.list_user_maps(current_user.id, skip=skip, limit=limit)
    paginated = PaginatedResponse.create(items, total, page, limit)
    return ResponseEnvelope(data=paginated)


@router.get(
    "/public",
    response_model=ResponseEnvelope[PaginatedResponse[MapResponse]],
    summary="List public exploration maps",
)
async def list_public_maps(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    map_service: MapService = Depends(get_map_service),
):
    skip = (page - 1) * limit
    items, total = await map_service.list_public_maps(skip=skip, limit=limit)
    paginated = PaginatedResponse.create(items, total, page, limit)
    return ResponseEnvelope(data=paginated)


@router.get(
    "/{map_id}",
    response_model=ResponseEnvelope[MapResponse],
    summary="Get details of a specific exploration map",
)
async def get_map(
    map_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    map_service: MapService = Depends(get_map_service),
):
    user_id = current_user.id if current_user else None
    result = await map_service.get_map(map_id, user_id=user_id)
    return ResponseEnvelope(data=result)


@router.patch(
    "/{map_id}",
    response_model=ResponseEnvelope[MapResponse],
    summary="Update exploration map metadata or region settings",
)
async def update_map(
    map_id: str,
    data: MapUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    map_service: MapService = Depends(get_map_service),
):
    result = await map_service.update_map(map_id, current_user.id, data)
    return ResponseEnvelope(data=result)


@router.delete(
    "/{map_id}",
    response_model=ResponseEnvelope[MessageResponse],
    summary="Delete an exploration map",
)
async def delete_map(
    map_id: str,
    current_user: UserModel = Depends(get_current_user),
    map_service: MapService = Depends(get_map_service),
):
    await map_service.delete_map(map_id, current_user.id)
    return ResponseEnvelope(data=MessageResponse(message=f"Map '{map_id}' was successfully deleted."))


@router.get(
    "/{map_id}/statistics",
    response_model=ResponseEnvelope[MapStatisticsResponse],
    summary="Get exploration statistics for a map",
)
async def get_map_statistics(
    map_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    map_service: MapService = Depends(get_map_service),
):
    user_id = current_user.id if current_user else None
    stats = await map_service.get_map_statistics(map_id, user_id=user_id)
    return ResponseEnvelope(data=stats)


@router.get(
    "/{map_id}/cells",
    response_model=ResponseEnvelope[PaginatedResponse[ExplorationCellResponse]],
    summary="List explored cells on a map",
)
async def list_map_cells(
    map_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    map_service: MapService = Depends(get_map_service),
):
    user_id = current_user.id if current_user else None
    skip = (page - 1) * limit
    cells, total = await map_service.list_cells(map_id, user_id=user_id, skip=skip, limit=limit)
    cell_responses = [
        ExplorationCellResponse(
            id=c.id,
            map_id=c.map_id,
            cell_id=c.cell_id,
            first_discovered_at=c.first_discovered_at,
            last_visited_at=c.last_visited_at,
            cell_center=c.cell_center,
            discovery_count=c.discovery_count,
        )
        for c in cells
    ]
    paginated = PaginatedResponse.create(cell_responses, total, page, limit)
    return ResponseEnvelope(data=paginated)


@router.post(
    "/{map_id}/check-ins",
    response_model=ResponseEnvelope[CheckInResponse],
    summary="Record a check-in to an exploration cell (Idempotent)",
)
async def check_in(
    map_id: str,
    data: CheckInRequest,
    current_user: UserModel = Depends(get_current_user),
    map_service: MapService = Depends(get_map_service),
):
    result = await map_service.check_in(map_id, current_user.id, data)
    return ResponseEnvelope(data=result)
