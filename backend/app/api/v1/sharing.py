from typing import List
from fastapi import APIRouter, Depends, Query, status
from app.api.dependencies import get_current_user, get_sharing_service
from app.models.user import UserModel
from app.schemas.common import MessageResponse, ResponseEnvelope
from app.schemas.sharing import (
    CreateShareRequest,
    ShareResponse,
    ShareSummaryResponse,
    SharedDiscoveryPublicView,
    SharedMapPublicView,
)
from app.services.sharing_service import SharingService
from app.utils.pagination import PaginatedResponse

router = APIRouter(tags=["Map Sharing & Friend View"])


@router.post(
    "/maps/{map_id}/shares",
    response_model=ResponseEnvelope[ShareResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a cryptographically secure, revocable share link for a map",
)
async def create_share_link(
    map_id: str,
    data: CreateShareRequest,
    current_user: UserModel = Depends(get_current_user),
    sharing_service: SharingService = Depends(get_sharing_service),
):
    result = await sharing_service.create_share_link(map_id, current_user.id, data)
    return ResponseEnvelope(data=result)


@router.get(
    "/maps/{map_id}/shares",
    response_model=ResponseEnvelope[List[ShareSummaryResponse]],
    summary="List active share links created for this map",
)
async def list_shares(
    map_id: str,
    current_user: UserModel = Depends(get_current_user),
    sharing_service: SharingService = Depends(get_sharing_service),
):
    result = await sharing_service.list_map_shares(map_id, current_user.id)
    return ResponseEnvelope(data=result)


@router.delete(
    "/maps/{map_id}/shares/{share_id}",
    response_model=ResponseEnvelope[MessageResponse],
    summary="Revoke a share link immediately",
)
async def revoke_share(
    map_id: str,
    share_id: str,
    current_user: UserModel = Depends(get_current_user),
    sharing_service: SharingService = Depends(get_sharing_service),
):
    await sharing_service.revoke_share_link(share_id, map_id, current_user.id)
    return ResponseEnvelope(
        data=MessageResponse(message=f"Share link '{share_id}' was successfully revoked.")
    )


@router.get(
    "/shared/{share_token}",
    response_model=ResponseEnvelope[SharedMapPublicView],
    summary="Public endpoint: view a shared map using a valid share token (no login required)",
)
async def get_shared_map(
    share_token: str,
    sharing_service: SharingService = Depends(get_sharing_service),
):
    view, _ = await sharing_service.get_shared_map_by_token(share_token)
    return ResponseEnvelope(data=view)


@router.get(
    "/shared/{share_token}/discoveries",
    response_model=ResponseEnvelope[PaginatedResponse[SharedDiscoveryPublicView]],
    summary="Public endpoint: view sanitized discoveries on a shared map (no login required)",
)
async def get_shared_discoveries(
    share_token: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sharing_service: SharingService = Depends(get_sharing_service),
):
    skip = (page - 1) * limit
    items, total = await sharing_service.get_shared_discoveries(share_token, skip=skip, limit=limit)
    paginated = PaginatedResponse.create(items, total, page, limit)
    return ResponseEnvelope(data=paginated)
