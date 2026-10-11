from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
import uuid
from app.models.exploration_cell import ExplorationCellModel


class CellRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.exploration_cells

    async def get_cell(self, map_id: str, cell_id: str) -> Optional[ExplorationCellModel]:
        doc = await self.collection.find_one({"map_id": map_id, "cell_id": cell_id})
        if not doc:
            return None
        return ExplorationCellModel(**doc)

    async def record_visit(
        self,
        map_id: str,
        cell_id: str,
        owner_id: Optional[str] = None,
        cell_center: Optional[dict] = None,
    ) -> Tuple[ExplorationCellModel, bool]:
        """
        Record a cell visit idempotently.
        Returns (cell_model, is_new_cell).
        If the cell was already discovered for this map, only last_visited_at and
        discovery_count are updated.
        """
        now = datetime.now(timezone.utc)
        existing = await self.collection.find_one({"map_id": map_id, "cell_id": cell_id})

        if existing:
            updated = await self.collection.find_one_and_update(
                {"map_id": map_id, "cell_id": cell_id},
                {
                    "$set": {"last_visited_at": now},
                    "$inc": {"discovery_count": 1},
                },
                return_document=True,
            )
            return ExplorationCellModel(**updated), False

        # Brand new cell
        new_cell = ExplorationCellModel(
            id=str(uuid.uuid4()),
            map_id=map_id,
            cell_id=cell_id,
            owner_id=owner_id,
            first_discovered_at=now,
            last_visited_at=now,
            cell_center=cell_center,
            discovery_count=1,
        )
        await self.collection.insert_one(new_cell.model_dump())
        return new_cell, True

    async def list_cells(
        self, map_id: str, skip: int = 0, limit: int = 50
    ) -> Tuple[List[ExplorationCellModel], int]:
        query = {"map_id": map_id}
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("first_discovered_at", -1).skip(skip).limit(limit)
        items = [ExplorationCellModel(**doc) async for doc in cursor]
        return items, total

    async def count_by_map(self, map_id: str) -> int:
        return await self.collection.count_documents({"map_id": map_id})

    async def count_distinct_cells_by_owner(self, owner_id: str) -> int:
        distinct = await self.collection.distinct("cell_id", {"owner_id": owner_id})
        return len(distinct)
