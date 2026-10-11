from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.dependencies import (
    get_current_user,
    get_current_user_optional,
    get_discovery_service,
)
from app.models.enums import DiscoveryVisibility, SkillCategory
from app.models.user import UserModel
from app.schemas.common import MessageResponse, ResponseEnvelope
from app.schemas.discovery import (
    DiscoveryCreateRequest,
    DiscoveryResponse,
    DiscoveryUpdateRequest,
)
from app.services.discovery_service import DiscoveryService
from app.utils.pagination import PaginatedResponse

router = APIRouter(tags=["Discoveries & Memory Atlas"])


@router.post(
    "/discoveries",
    response_model=ResponseEnvelope[DiscoveryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Record a new discovery",
)
async def create_discovery(
    data: DiscoveryCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
):
    result = await discovery_service.create_discovery(current_user.id, data)
    return ResponseEnvelope(data=result)


@router.get(
    "/discoveries",
    response_model=ResponseEnvelope[PaginatedResponse[DiscoveryResponse]],
    summary="List discoveries with optional filters and pagination",
)
async def list_discoveries(
    map_id: Optional[str] = Query(None),
    skill_category: Optional[SkillCategory] = Query(None),
    visibility: Optional[DiscoveryVisibility] = Query(None),
    quest_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
):
    skip = (page - 1) * limit
    items, total = await discovery_service.list_discoveries(
        user_id=current_user.id,
        map_id=map_id,
        skill_category=skill_category.value if skill_category else None,
        visibility=visibility.value if visibility else None,
        quest_id=quest_id,
        skip=skip,
        limit=limit,
    )
    paginated = PaginatedResponse.create(items, total, page, limit)
    return ResponseEnvelope(data=paginated)


@router.get(
    "/discoveries/{discovery_id}",
    response_model=ResponseEnvelope[DiscoveryResponse],
    summary="Get details of a specific discovery",
)
async def get_discovery(
    discovery_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
):
    user_id = current_user.id if current_user else None
    result = await discovery_service.get_discovery(discovery_id, user_id=user_id)
    return ResponseEnvelope(data=result)


@router.patch(
    "/discoveries/{discovery_id}",
    response_model=ResponseEnvelope[DiscoveryResponse],
    summary="Update a discovery",
)
async def update_discovery(
    discovery_id: str,
    data: DiscoveryUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
):
    result = await discovery_service.update_discovery(discovery_id, current_user.id, data)
    return ResponseEnvelope(data=result)


@router.delete(
    "/discoveries/{discovery_id}",
    response_model=ResponseEnvelope[MessageResponse],
    summary="Delete a discovery",
)
async def delete_discovery(
    discovery_id: str,
    current_user: UserModel = Depends(get_current_user),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
):
    await discovery_service.delete_discovery(discovery_id, current_user.id)
    return ResponseEnvelope(
        data=MessageResponse(message=f"Discovery '{discovery_id}' was successfully deleted.")
    )


@router.get(
    "/maps/{map_id}/discoveries",
    response_model=ResponseEnvelope[PaginatedResponse[Any]],
    summary="List discoveries belonging to a specific map",
)
async def list_map_discoveries(
    map_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
):
    user_id = current_user.id if current_user else None
    skip = (page - 1) * limit
    items, total = await discovery_service.list_map_discoveries(
        map_id=map_id, user_id=user_id, skip=skip, limit=limit
    )
    paginated = PaginatedResponse.create(items, total, page, limit)
    return ResponseEnvelope(data=paginated)
