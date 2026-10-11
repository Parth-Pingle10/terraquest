from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
from app.models.exploration_map import ExplorationMapModel


class MapRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.exploration_maps

    async def create(self, map_obj: ExplorationMapModel) -> ExplorationMapModel:
        doc = map_obj.model_dump()
        await self.collection.insert_one(doc)
        return map_obj

    async def get_by_id(self, map_id: str) -> Optional[ExplorationMapModel]:
        doc = await self.collection.find_one({"id": map_id})
        if not doc:
            return None
        return ExplorationMapModel(**doc)

    async def list_by_owner(
        self, owner_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[ExplorationMapModel], int]:
        query = {"owner_id": owner_id}
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = [ExplorationMapModel(**doc) async for doc in cursor]
        return items, total

    async def list_public(self, skip: int = 0, limit: int = 20) -> Tuple[List[ExplorationMapModel], int]:
        query = {"map_visibility": "public"}
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = [ExplorationMapModel(**doc) async for doc in cursor]
        return items, total

    async def update(self, map_id: str, update_data: dict) -> Optional[ExplorationMapModel]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.find_one_and_update(
            {"id": map_id},
            {"$set": update_data},
            return_document=True,
        )
        if not result:
            return None
        return ExplorationMapModel(**result)

    async def delete(self, map_id: str) -> bool:
        result = await self.collection.delete_one({"id": map_id})
        return result.deleted_count > 0

    async def increment_cells_count(self, map_id: str, count: int = 1) -> Optional[ExplorationMapModel]:
        result = await self.collection.find_one_and_update(
            {"id": map_id},
            {
                "$inc": {"discovered_cells_count": count},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            return_document=True,
        )
        if not result:
            return None
        return ExplorationMapModel(**result)
