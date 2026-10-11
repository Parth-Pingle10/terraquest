from datetime import datetime, timezone
from typing import Any, List, Optional
from app.models.share import MapShareModel


class ShareRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.map_shares

    async def create(self, share: MapShareModel) -> MapShareModel:
        doc = share.model_dump()
        await self.collection.insert_one(doc)
        return share

    async def get_by_id(self, share_id: str) -> Optional[MapShareModel]:
        doc = await self.collection.find_one({"id": share_id})
        if not doc:
            return None
        return MapShareModel(**doc)

    async def get_by_token_hash(self, token_hash: str) -> Optional[MapShareModel]:
        doc = await self.collection.find_one({"token_hash": token_hash})
        if not doc:
            return None
        return MapShareModel(**doc)

    async def list_by_map(self, map_id: str) -> List[MapShareModel]:
        cursor = self.collection.find({"map_id": map_id}).sort("created_at", -1)
        return [MapShareModel(**doc) async for doc in cursor]

    async def revoke(self, share_id: str) -> bool:
        now = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {"id": share_id},
            {"$set": {"revoked_at": now}},
        )
        return result.modified_count > 0
