from datetime import datetime, timezone
from typing import List
from app.models.discovery import DiscoveryModel
from app.repositories.cell_repository import CellRepository
from app.repositories.discovery_repository import DiscoveryRepository
from app.repositories.map_repository import MapRepository
from app.schemas.sync import (
    ClientDiscoverySyncItem,
    ClientExplorationSyncItem,
    SyncDiscoveriesResponse,
    SyncExplorationResponse,
)
from app.utils.geo import compute_cell_id, validate_coordinates


class SyncService:
    def __init__(
        self,
        discovery_repo: DiscoveryRepository,
        map_repo: MapRepository,
        cell_repo: CellRepository,
    ) -> None:
        self.discovery_repo = discovery_repo
        self.map_repo = map_repo
        self.cell_repo = cell_repo

    async def sync_discoveries(
        self, user_id: str, items: List[ClientDiscoverySyncItem]
    ) -> SyncDiscoveriesResponse:
        synced_ids = []
        conflicts_resolved = 0

        for item in items:
            # Verify map ownership or fallback to creating discovery on specified map
            map_obj = await self.map_repo.get_by_id(item.map_id)
            if not map_obj or map_obj.owner_id != user_id:
                continue

            existing = await self.discovery_repo.get_by_id(item.client_id)
            if existing:
                # Conflict resolution: if server record exists and is newer, keep server record
                srv_up = existing.updated_at.replace(tzinfo=timezone.utc) if existing.updated_at.tzinfo is None else existing.updated_at
                cli_up = item.client_updated_at.replace(tzinfo=timezone.utc) if item.client_updated_at.tzinfo is None else item.client_updated_at
                if srv_up >= cli_up:
                    conflicts_resolved += 1
                    continue
                # Client is newer, update existing
                update_data = {
                    "title": item.title,
                    "description": item.description,
                    "observation": item.observation,
                    "personal_reflection": item.personal_reflection,
                    "visibility": item.visibility,
                    "updated_at": item.client_updated_at,
                }
                await self.discovery_repo.update(item.client_id, update_data)
                synced_ids.append(item.client_id)
            else:
                # Brand new record with stable client ID
                cell_id = item.optional_cell_id
                if item.optional_latitude is not None and item.optional_longitude is not None:
                    validate_coordinates(item.optional_latitude, item.optional_longitude)
                    if not cell_id:
                        cell_id = compute_cell_id(item.optional_latitude, item.optional_longitude)

                model = DiscoveryModel(
                    id=item.client_id,
                    owner_id=user_id,
                    map_id=item.map_id,
                    title=item.title,
                    description=item.description,
                    observation=item.observation,
                    personal_reflection=item.personal_reflection,
                    optional_photo_reference=item.optional_photo_reference,
                    photo_approved_for_sharing=item.photo_approved_for_sharing,
                    skill_category=item.skill_category,
                    optional_quest_id=item.optional_quest_id,
                    optional_location_name=item.optional_location_name,
                    optional_latitude=item.optional_latitude,
                    optional_longitude=item.optional_longitude,
                    optional_cell_id=cell_id,
                    visibility=item.visibility,
                    created_at=item.client_updated_at,
                    updated_at=item.client_updated_at,
                )
                await self.discovery_repo.create(model)
                synced_ids.append(item.client_id)

        return SyncDiscoveriesResponse(
            synced_count=len(synced_ids),
            conflicts_resolved=conflicts_resolved,
            synced_ids=synced_ids,
        )

    async def sync_exploration(
        self, user_id: str, items: List[ClientExplorationSyncItem]
    ) -> SyncExplorationResponse:
        synced_count = 0
        new_cells_count = 0

        for item in items:
            map_obj = await self.map_repo.get_by_id(item.map_id)
            if not map_obj or map_obj.owner_id != user_id:
                continue

            cell_id = None
            cell_center = None
            if item.latitude is not None and item.longitude is not None:
                validate_coordinates(item.latitude, item.longitude)
                cell_id = compute_cell_id(item.latitude, item.longitude)
                cell_center = {"latitude": item.latitude, "longitude": item.longitude}
            elif item.manual_cell_id:
                cell_id = item.manual_cell_id.strip()

            if not cell_id:
                continue

            _, is_new = await self.cell_repo.record_visit(
                map_id=item.map_id,
                cell_id=cell_id,
                owner_id=user_id,
                cell_center=cell_center,
            )
            synced_count += 1
            if is_new:
                new_cells_count += 1
                await self.map_repo.increment_cells_count(item.map_id, 1)

        return SyncExplorationResponse(
            synced_cells_count=synced_count,
            new_cells_count=new_cells_count,
        )
