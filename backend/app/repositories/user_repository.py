from datetime import datetime, timezone
from typing import Any, Optional
from app.models.user import UserModel


class UserRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.users

    async def create(self, user: UserModel) -> UserModel:
        doc = user.model_dump()
        await self.collection.insert_one(doc)
        return user

    async def get_by_id(self, user_id: str) -> Optional[UserModel]:
        doc = await self.collection.find_one({"id": user_id})
        if not doc:
            return None
        return UserModel(**doc)

    async def get_by_username(self, username: str) -> Optional[UserModel]:
        doc = await self.collection.find_one({"username": username})
        if not doc:
            return None
        return UserModel(**doc)

    async def update(self, user_id: str, update_data: dict) -> Optional[UserModel]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.find_one_and_update(
            {"id": user_id},
            {"$set": update_data},
            return_document=True,
        )
        if not result:
            return None
        return UserModel(**result)
