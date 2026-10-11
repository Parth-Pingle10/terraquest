from typing import Any, Dict, List, Optional, Tuple
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.discovery import DiscoveryModel
from app.models.enums import DiscoveryVisibility, MapVisibility
from app.repositories.discovery_repository import DiscoveryRepository
from app.repositories.map_repository import MapRepository
from app.schemas.discovery import (
    DiscoveryCreateRequest,
    DiscoveryPublicResponse,
    DiscoveryResponse,
    DiscoveryUpdateRequest,
)
from app.utils.geo import compute_cell_id, validate_coordinates


class DiscoveryService:
    def __init__(
        self,
        discovery_repo: DiscoveryRepository,
        map_repo: MapRepository,
    ) -> None:
        self.discovery_repo = discovery_repo
        self.map_repo = map_repo

    async def create_discovery(
        self, owner_id: str, data: DiscoveryCreateRequest
    ) -> DiscoveryResponse:
        # Verify map ownership
        map_obj = await self.map_repo.get_by_id(data.map_id)
        if not map_obj:
            raise NotFoundError("Map", data.map_id)
        if map_obj.owner_id != owner_id:
            raise ForbiddenError("Discoveries can only be created on your own maps.")

        cell_id = data.optional_cell_id
        if data.optional_latitude is not None and data.optional_longitude is not None:
            validate_coordinates(data.optional_latitude, data.optional_longitude)
            if not cell_id:
                cell_id = compute_cell_id(data.optional_latitude, data.optional_longitude)

        model = DiscoveryModel(
            owner_id=owner_id,
            map_id=data.map_id,
            title=data.title,
            description=data.description,
            observation=data.observation,
            personal_reflection=data.personal_reflection,
            optional_ai_reflection=data.optional_ai_reflection,
            optional_photo_reference=data.optional_photo_reference,
            photo_approved_for_sharing=data.photo_approved_for_sharing,
            skill_category=data.skill_category,
            optional_quest_id=data.optional_quest_id,
            optional_location_name=data.optional_location_name,
            optional_latitude=data.optional_latitude,
            optional_longitude=data.optional_longitude,
            optional_cell_id=cell_id,
            visibility=data.visibility,
        )
        created = await self.discovery_repo.create(model)
        return self._to_full_response(created)

    async def get_discovery(
        self, discovery_id: str, user_id: Optional[str] = None
    ) -> DiscoveryResponse:
        disc = await self.discovery_repo.get_by_id(discovery_id)
        if not disc:
            raise NotFoundError("Discovery", discovery_id)

        # Private check
        if disc.visibility == DiscoveryVisibility.PRIVATE and disc.owner_id != user_id:
            raise ForbiddenError("You do not have access to this private discovery.")

        return self._to_full_response(disc)

    async def list_discoveries(
        self,
        user_id: str,
        map_id: Optional[str] = None,
        skill_category: Optional[str] = None,
        visibility: Optional[str] = None,
        quest_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[DiscoveryResponse], int]:
        items, total = await self.discovery_repo.list_filtered(
            owner_id=user_id,
            map_id=map_id,
            skill_category=skill_category,
            visibility=visibility,
            quest_id=quest_id,
            skip=skip,
            limit=limit,
        )
        return [self._to_full_response(d) for d in items], total

    async def update_discovery(
        self, discovery_id: str, user_id: str, data: DiscoveryUpdateRequest
    ) -> DiscoveryResponse:
        disc = await self.discovery_repo.get_by_id(discovery_id)
        if not disc:
            raise NotFoundError("Discovery", discovery_id)
        if disc.owner_id != user_id:
            raise ForbiddenError("Only the owner can update this discovery.")

        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if not update_dict:
            return self._to_full_response(disc)

        updated = await self.discovery_repo.update(discovery_id, update_dict)
        return self._to_full_response(updated)

    async def delete_discovery(self, discovery_id: str, user_id: str) -> bool:
        disc = await self.discovery_repo.get_by_id(discovery_id)
        if not disc:
            raise NotFoundError("Discovery", discovery_id)
        if disc.owner_id != user_id:
            raise ForbiddenError("Only the owner can delete this discovery.")

        return await self.discovery_repo.delete(discovery_id)

    async def list_map_discoveries(
        self, map_id: str, user_id: Optional[str], skip: int = 0, limit: int = 20
    ) -> Tuple[List[Any], int]:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)

        is_owner = map_obj.owner_id == user_id
        if not is_owner and map_obj.map_visibility != MapVisibility.PUBLIC:
            raise ForbiddenError("Access to this map's discoveries is restricted.")

        # If owner: return full responses. If public viewer: return sanitized public responses!
        if is_owner:
            items, total = await self.discovery_repo.list_filtered(
                map_id=map_id, skip=skip, limit=limit
            )
            return [self._to_full_response(d) for d in items], total
        else:
            # Only public/shared discoveries
            items, total = await self.discovery_repo.list_filtered(
                map_id=map_id,
                visibility=DiscoveryVisibility.PUBLIC.value,
                skip=skip,
                limit=limit,
            )
            return [self.to_sanitized_public_response(d) for d in items], total

    def _to_full_response(self, d: DiscoveryModel) -> DiscoveryResponse:
        return DiscoveryResponse(
            id=d.id,
            owner_id=d.owner_id,
            map_id=d.map_id,
            title=d.title,
            description=d.description,
            observation=d.observation,
            personal_reflection=d.personal_reflection,
            optional_ai_reflection=d.optional_ai_reflection,
            optional_photo_reference=d.optional_photo_reference,
            photo_approved_for_sharing=d.photo_approved_for_sharing,
            skill_category=d.skill_category,
            optional_quest_id=d.optional_quest_id,
            optional_location_name=d.optional_location_name,
            optional_latitude=d.optional_latitude,
            optional_longitude=d.optional_longitude,
            optional_cell_id=d.optional_cell_id,
            visibility=d.visibility,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )

    @staticmethod
    def to_sanitized_public_response(
        d: DiscoveryModel,
        include_titles: bool = True,
        include_descriptions: bool = True,
        include_photos: bool = False,
        include_approximate_loc: bool = False,
    ) -> DiscoveryPublicResponse:
        """
        Sanitize discovery for public and shared views.
        NEVER includes personal_reflection or unapproved photo references.
        """
        approx_lat = round(d.optional_latitude, 2) if (include_approximate_loc and d.optional_latitude is not None) else None
        approx_lon = round(d.optional_longitude, 2) if (include_approximate_loc and d.optional_longitude is not None) else None

        # Only include photo reference if user explicitly approved sharing AND share permission includes photos
        photo_ref = d.optional_photo_reference if (include_photos and d.photo_approved_for_sharing) else None

        return DiscoveryPublicResponse(
            id=d.id,
            map_id=d.map_id,
            title=d.title if include_titles else None,
            description=d.description if include_descriptions else None,
            observation=d.observation,
            optional_photo_reference=photo_ref,
            skill_category=d.skill_category,
            optional_location_name=d.optional_location_name if include_approximate_loc else None,
            approximate_latitude=approx_lat,
            approximate_longitude=approx_lon,
            created_at=d.created_at,
        )
