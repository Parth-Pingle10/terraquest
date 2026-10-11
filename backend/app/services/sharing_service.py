from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import generate_share_token, hash_share_token
from app.models.enums import DiscoveryVisibility, MapVisibility, SharePermission
from app.models.share import MapShareModel
from app.repositories.discovery_repository import DiscoveryRepository
from app.repositories.map_repository import MapRepository
from app.repositories.share_repository import ShareRepository
from app.schemas.sharing import (
    CreateShareRequest,
    ShareResponse,
    ShareSummaryResponse,
    SharedDiscoveryPublicView,
    SharedMapPublicView,
)
from app.services.map_service import calculate_percentage
from app.utils.geo import compute_cell_id


class SharingService:
    def __init__(
        self,
        share_repo: ShareRepository,
        map_repo: MapRepository,
        discovery_repo: DiscoveryRepository,
    ) -> None:
        self.share_repo = share_repo
        self.map_repo = map_repo
        self.discovery_repo = discovery_repo

    async def create_share_link(
        self, map_id: str, owner_id: str, data: CreateShareRequest
    ) -> ShareResponse:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)
        if map_obj.owner_id != owner_id:
            raise ForbiddenError("Only the map owner can generate share links.")

        # Generate cryptographic random token
        raw_token = generate_share_token()
        token_hash = hash_share_token(raw_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=data.expires_in_hours) if data.expires_in_hours else None

        share_model = MapShareModel(
            map_id=map_id,
            owner_id=owner_id,
            token_hash=token_hash,
            permission=data.permission,
            include_discovery_titles=data.include_discovery_titles,
            include_discovery_descriptions=data.include_discovery_descriptions,
            include_approved_photos=data.include_approved_photos,
            include_approximate_locations=data.include_approximate_locations,
            expires_at=expires_at,
            created_at=now,
        )
        saved = await self.share_repo.create(share_model)

        # If map was private, update visibility to unlisted so it is accessible via token
        if map_obj.map_visibility == MapVisibility.PRIVATE:
            await self.map_repo.update(map_id, {"map_visibility": MapVisibility.UNLISTED.value})

        return ShareResponse(
            share_id=saved.id,
            map_id=saved.map_id,
            share_token=raw_token,  # Plaintext token returned ONLY once
            share_path=f"/api/v1/shared/{raw_token}",
            permission=saved.permission,
            include_discovery_titles=saved.include_discovery_titles,
            include_discovery_descriptions=saved.include_discovery_descriptions,
            include_approved_photos=saved.include_approved_photos,
            include_approximate_locations=saved.include_approximate_locations,
            expires_at=saved.expires_at,
            created_at=saved.created_at,
        )

    async def list_map_shares(self, map_id: str, owner_id: str) -> List[ShareSummaryResponse]:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)
        if map_obj.owner_id != owner_id:
            raise ForbiddenError("Only the map owner can list active share links.")

        shares = await self.share_repo.list_by_map(map_id)
        return [
            ShareSummaryResponse(
                share_id=s.id,
                map_id=s.map_id,
                permission=s.permission,
                is_active=s.is_active,
                expires_at=s.expires_at,
                revoked_at=s.revoked_at,
                created_at=s.created_at,
            )
            for s in shares
        ]

    async def revoke_share_link(self, share_id: str, map_id: str, owner_id: str) -> bool:
        share = await self.share_repo.get_by_id(share_id)
        if not share or share.map_id != map_id:
            raise NotFoundError("Share link", share_id)
        if share.owner_id != owner_id:
            raise ForbiddenError("Only the owner can revoke this share link.")

        return await self.share_repo.revoke(share_id)

    async def get_shared_map_by_token(self, raw_token: str) -> Tuple[SharedMapPublicView, MapShareModel]:
        """Validate share token and return sanitized map public view."""
        token_hash = hash_share_token(raw_token)
        share = await self.share_repo.get_by_token_hash(token_hash)
        if not share:
            raise NotFoundError("Shared resource or invalid share token")

        if not share.is_active:
            raise ForbiddenError("This share link has expired or was revoked by the owner.")

        map_obj = await self.map_repo.get_by_id(share.map_id)
        if not map_obj:
            raise NotFoundError("Map")

        pct = calculate_percentage(map_obj.discovered_cells_count, map_obj.region_grid_cells)

        view = SharedMapPublicView(
            map_id=map_obj.id,
            title=map_obj.title,
            description=map_obj.description,
            discovered_cells_count=map_obj.discovered_cells_count,
            exploration_percentage=pct,
            created_at=map_obj.created_at,
            can_view_titles=share.include_discovery_titles,
            can_view_descriptions=share.include_discovery_descriptions,
            can_view_photos=share.include_approved_photos,
            can_view_locations=share.include_approximate_locations,
        )
        return view, share

    async def get_shared_discoveries(
        self, raw_token: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[SharedDiscoveryPublicView], int]:
        _, share = await self.get_shared_map_by_token(raw_token)

        # Retrieve discoveries for this map that are NOT strictly private
        # Only shared and public discoveries are returned to visitors
        raw_items, total = await self.discovery_repo.list_filtered(
            map_id=share.map_id,
            skip=skip,
            limit=limit,
        )

        sanitized_items = []
        for d in raw_items:
            # Skip if explicitly marked private by owner
            if d.visibility == DiscoveryVisibility.PRIVATE:
                continue

            # Only include photo reference if user approved it AND share permission permits it
            photo = d.optional_photo_reference if (share.include_approved_photos and d.photo_approved_for_sharing) else None

            # Only approximate coordinates if enabled
            approx_lat = round(d.optional_latitude, 2) if (share.include_approximate_locations and d.optional_latitude is not None) else None
            approx_lon = round(d.optional_longitude, 2) if (share.include_approximate_locations and d.optional_longitude is not None) else None

            sanitized_items.append(
                SharedDiscoveryPublicView(
                    id=d.id,
                    title=d.title if share.include_discovery_titles else None,
                    description=d.description if share.include_discovery_descriptions else None,
                    observation=d.observation,
                    optional_photo_reference=photo,
                    skill_category=d.skill_category,
                    optional_location_name=d.optional_location_name if share.include_approximate_locations else None,
                    approximate_latitude=approx_lat,
                    approximate_longitude=approx_lon,
                    created_at=d.created_at,
                )
            )

        return sanitized_items, len(sanitized_items)
