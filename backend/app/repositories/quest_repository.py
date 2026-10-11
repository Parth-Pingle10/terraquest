from typing import Any, List, Optional
from app.models.quest import QuestModel


class QuestRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.quests

    async def create(self, quest: QuestModel) -> QuestModel:
        doc = quest.model_dump()
        await self.collection.insert_one(doc)
        return quest

    async def get_by_id(self, quest_id: str) -> Optional[QuestModel]:
        doc = await self.collection.find_one({"id": quest_id})
        if not doc:
            return None
        return QuestModel(**doc)

    async def list_quests(
        self,
        skill_category: Optional[str] = None,
        difficulty: Optional[str] = None,
        active_only: bool = True,
    ) -> List[QuestModel]:
        query: dict = {}
        if active_only:
            query["active"] = True
        if skill_category:
            query["skill_category"] = skill_category
        if difficulty:
            query["difficulty"] = difficulty

        cursor = self.collection.find(query).sort("created_at", 1)
        return [QuestModel(**doc) async for doc in cursor]

    async def count(self) -> int:
        return await self.collection.count_documents({})

    async def bulk_insert(self, quests: List[QuestModel]) -> int:
        if not quests:
            return 0
        docs = [q.model_dump() for q in quests]
        result = await self.collection.insert_many(docs)
        return len(result.inserted_ids)
