from typing import Optional, Tuple
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.enums import MapVisibility
from app.models.exploration_map import ExplorationMapModel
from app.repositories.cell_repository import CellRepository
from app.repositories.discovery_repository import DiscoveryRepository
from app.repositories.map_repository import MapRepository
from app.schemas.map import (
    CheckInRequest,
    CheckInResponse,
    MapCreateRequest,
    MapResponse,
    MapStatisticsResponse,
    MapUpdateRequest,
)
from app.utils.geo import compute_cell_id, get_cell_center, validate_coordinates


def calculate_percentage(discovered: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(min(100.0, (discovered / denominator) * 100.0), 2)


class MapService:
    def __init__(
        self,
        map_repo: MapRepository,
        cell_repo: CellRepository,
        discovery_repo: DiscoveryRepository,
    ) -> None:
        self.map_repo = map_repo
        self.cell_repo = cell_repo
        self.discovery_repo = discovery_repo

    async def create_map(self, owner_id: str, data: MapCreateRequest) -> MapResponse:
        map_obj = ExplorationMapModel(
            owner_id=owner_id,
            title=data.title,
            description=data.description,
            map_visibility=data.map_visibility,
            region_name=data.region_name,
            region_grid_cells=data.region_grid_cells,
        )
        created = await self.map_repo.create(map_obj)
        return self._to_response(created)

    async def get_map(self, map_id: str, user_id: Optional[str] = None) -> MapResponse:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)

        # Access check: public maps can be seen by anyone; private/unlisted by owner
        if map_obj.map_visibility != MapVisibility.PUBLIC and map_obj.owner_id != user_id:
            raise ForbiddenError("You do not have permission to view this private map.")

        return self._to_response(map_obj)

    async def list_user_maps(self, user_id: str, skip: int = 0, limit: int = 20) -> Tuple[list, int]:
        maps, total = await self.map_repo.list_by_owner(user_id, skip=skip, limit=limit)
        return [self._to_response(m) for m in maps], total

    async def list_public_maps(self, skip: int = 0, limit: int = 20) -> Tuple[list, int]:
        maps, total = await self.map_repo.list_public(skip=skip, limit=limit)
        return [self._to_response(m) for m in maps], total

    async def update_map(self, map_id: str, user_id: str, data: MapUpdateRequest) -> MapResponse:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)
        if map_obj.owner_id != user_id:
            raise ForbiddenError("Only the map owner can modify this map.")

        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if not update_dict:
            return self._to_response(map_obj)

        updated = await self.map_repo.update(map_id, update_dict)
        return self._to_response(updated)

    async def delete_map(self, map_id: str, user_id: str) -> bool:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)
        if map_obj.owner_id != user_id:
            raise ForbiddenError("Only the map owner can delete this map.")

        return await self.map_repo.delete(map_id)

    async def check_in(
        self, map_id: str, user_id: Optional[str], data: CheckInRequest
    ) -> CheckInResponse:
        """
        Record a check-in to a map cell.
        Idempotent: repeating check-in for an already discovered cell updates last_visited_at
        without inflating the unique discovered_cells_count on the map.
        """
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)
        if map_obj.owner_id != user_id:
            raise ForbiddenError("Check-ins can only be recorded by the map owner.")

        cell_center = None
        # Determine cell_id
        if data.latitude is not None and data.longitude is not None:
            validate_coordinates(data.latitude, data.longitude)
            cell_id = compute_cell_id(data.latitude, data.longitude)
            cell_center = {"latitude": data.latitude, "longitude": data.longitude}
        elif data.manual_cell_id:
            cell_id = data.manual_cell_id.strip()
        else:
            raise BadRequestError("Either GPS coordinates (latitude & longitude) or manual_cell_id must be provided.")

        # Record visit in cell repo
        cell, is_new = await self.cell_repo.record_visit(
            map_id=map_id,
            cell_id=cell_id,
            owner_id=user_id,
            cell_center=cell_center,
        )

        # If it's a new cell, increment map count
        if is_new:
            map_obj = await self.map_repo.increment_cells_count(map_id, 1) or map_obj

        pct = calculate_percentage(map_obj.discovered_cells_count, map_obj.region_grid_cells)

        return CheckInResponse(
            map_id=map_id,
            cell_id=cell_id,
            is_new_cell=is_new,
            total_discovered_cells=map_obj.discovered_cells_count,
            exploration_percentage=pct,
            cell_center=cell.cell_center or get_cell_center(cell_id),
        )

    async def get_map_statistics(self, map_id: str, user_id: Optional[str] = None) -> MapStatisticsResponse:
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)

        if map_obj.map_visibility != MapVisibility.PUBLIC and map_obj.owner_id != user_id:
            raise ForbiddenError("Access to this map's statistics is restricted to the owner.")

        total_discoveries = await self.discovery_repo.count_by_map(map_id)
        pct = calculate_percentage(map_obj.discovered_cells_count, map_obj.region_grid_cells)

        return MapStatisticsResponse(
            map_id=map_id,
            discovered_cells_count=map_obj.discovered_cells_count,
            region_name=map_obj.region_name,
            region_grid_cells=map_obj.region_grid_cells,
            exploration_percentage=pct,
            total_discoveries=total_discoveries,
            created_at=map_obj.created_at,
        )

    async def list_cells(self, map_id: str, user_id: Optional[str], skip: int = 0, limit: int = 50):
        map_obj = await self.map_repo.get_by_id(map_id)
        if not map_obj:
            raise NotFoundError("Map", map_id)
        if map_obj.map_visibility != MapVisibility.PUBLIC and map_obj.owner_id != user_id:
            raise ForbiddenError("Access to map cells is restricted.")

        return await self.cell_repo.list_cells(map_id, skip=skip, limit=limit)

    def _to_response(self, m: ExplorationMapModel) -> MapResponse:
        pct = calculate_percentage(m.discovered_cells_count, m.region_grid_cells)
        return MapResponse(
            id=m.id,
            owner_id=m.owner_id,
            title=m.title,
            description=m.description,
            map_visibility=m.map_visibility,
            discovered_cells_count=m.discovered_cells_count,
            region_name=m.region_name,
            region_grid_cells=m.region_grid_cells,
            exploration_percentage=pct,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
