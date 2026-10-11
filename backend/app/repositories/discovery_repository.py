from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
from app.models.discovery import DiscoveryModel


class DiscoveryRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.discoveries

    async def create(self, discovery: DiscoveryModel) -> DiscoveryModel:
        doc = discovery.model_dump()
        await self.collection.insert_one(doc)
        return discovery

    async def get_by_id(self, discovery_id: str) -> Optional[DiscoveryModel]:
        doc = await self.collection.find_one({"id": discovery_id})
        if not doc:
            return None
        return DiscoveryModel(**doc)

    async def list_filtered(
        self,
        owner_id: Optional[str] = None,
        map_id: Optional[str] = None,
        skill_category: Optional[str] = None,
        visibility: Optional[str] = None,
        quest_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[DiscoveryModel], int]:
        query: dict = {}
        if owner_id:
            query["owner_id"] = owner_id
        if map_id:
            query["map_id"] = map_id
        if skill_category:
            query["skill_category"] = skill_category
        if visibility:
            query["visibility"] = visibility
        if quest_id:
            query["optional_quest_id"] = quest_id

        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["created_at"] = date_filter

        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = [DiscoveryModel(**doc) async for doc in cursor]
        return items, total

    async def update(self, discovery_id: str, update_data: dict) -> Optional[DiscoveryModel]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.find_one_and_update(
            {"id": discovery_id},
            {"$set": update_data},
            return_document=True,
        )
        if not result:
            return None
        return DiscoveryModel(**result)

    async def delete(self, discovery_id: str) -> bool:
        result = await self.collection.delete_one({"id": discovery_id})
        return result.deleted_count > 0

    async def count_by_map(self, map_id: str) -> int:
        return await self.collection.count_documents({"map_id": map_id})

    async def count_by_owner(self, owner_id: str) -> int:
        return await self.collection.count_documents({"owner_id": owner_id})
