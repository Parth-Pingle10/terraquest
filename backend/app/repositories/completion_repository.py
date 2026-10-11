from typing import Any, List, Optional, Tuple
from app.models.quest import QuestCompletionModel


class CompletionRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.quest_completions

    async def create(self, completion: QuestCompletionModel) -> QuestCompletionModel:
        doc = completion.model_dump()
        await self.collection.insert_one(doc)
        return completion

    async def get_by_id(self, completion_id: str) -> Optional[QuestCompletionModel]:
        doc = await self.collection.find_one({"id": completion_id})
        if not doc:
            return None
        return QuestCompletionModel(**doc)

    async def get_by_user_and_quest(self, user_id: str, quest_id: str) -> Optional[QuestCompletionModel]:
        doc = await self.collection.find_one(
            {"user_id": user_id, "quest_id": quest_id},
            sort=[("started_at", -1)],
        )
        if not doc:
            return None
        return QuestCompletionModel(**doc)

    async def list_user_completions(
        self, user_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[QuestCompletionModel], int]:
        query = {"user_id": user_id, "status": "completed"}
        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("completed_at", -1).skip(skip).limit(limit)
        items = [QuestCompletionModel(**doc) async for doc in cursor]
        return items, total

    async def update(self, completion_id: str, update_data: dict) -> Optional[QuestCompletionModel]:
        result = await self.collection.find_one_and_update(
            {"id": completion_id},
            {"$set": update_data},
            return_document=True,
        )
        if not result:
            return None
        return QuestCompletionModel(**result)

    async def count_completed_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id, "status": "completed"})
