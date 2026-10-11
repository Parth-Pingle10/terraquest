from datetime import datetime, timezone
from typing import Any, List, Optional
import uuid
from app.models.enums import SkillCategory
from app.models.skill_progress import SkillProgressModel, calculate_level


class SkillRepository:
    def __init__(self, db: Any) -> None:
        self.collection = db.skill_progress

    async def get_progress(self, user_id: str, skill_category: str) -> SkillProgressModel:
        doc = await self.collection.find_one({"user_id": user_id, "skill_category": skill_category})
        if not doc:
            # Initialize branch if not found
            now = datetime.now(timezone.utc)
            new_model = SkillProgressModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                skill_category=SkillCategory(skill_category),
                xp=0,
                level=1,
                completed_quest_count=0,
                unlocked_categories=[SkillCategory.VISUAL_EXPLORER.value],
                updated_at=now,
            )
            await self.collection.insert_one(new_model.model_dump())
            return new_model
        return SkillProgressModel(**doc)

    async def get_all_branches(self, user_id: str) -> List[SkillProgressModel]:
        branches = []
        for cat in SkillCategory:
            progress = await self.get_progress(user_id, cat.value)
            branches.append(progress)
        return branches

    async def add_xp(self, user_id: str, skill_category: str, xp_to_add: int) -> SkillProgressModel:
        """
        Idempotent server-side XP addition and automatic level recalculation.
        """
        current = await self.get_progress(user_id, skill_category)
        new_xp = current.xp + xp_to_add
        new_level = calculate_level(new_xp)
        now = datetime.now(timezone.utc)

        updated = await self.collection.find_one_and_update(
            {"user_id": user_id, "skill_category": skill_category},
            {
                "$set": {
                    "xp": new_xp,
                    "level": new_level,
                    "updated_at": now,
                },
                "$inc": {
                    "completed_quest_count": 1,
                },
            },
            return_document=True,
        )
        return SkillProgressModel(**updated)
