from typing import List
from app.models.enums import SkillCategory
from app.models.skill_progress import calculate_xp_for_next_level
from app.repositories.completion_repository import CompletionRepository
from app.repositories.quest_repository import QuestRepository
from app.repositories.skill_repository import SkillRepository
from app.schemas.skill import (
    SkillHistoryItemResponse,
    SkillProgressResponse,
    SkillTreeResponse,
)


class SkillService:
    def __init__(
        self,
        skill_repo: SkillRepository,
        completion_repo: CompletionRepository,
        quest_repo: QuestRepository,
    ) -> None:
        self.skill_repo = skill_repo
        self.completion_repo = completion_repo
        self.quest_repo = quest_repo

    async def get_tree(self, user_id: str) -> SkillTreeResponse:
        branches = await self.skill_repo.get_all_branches(user_id)
        responses: List[SkillProgressResponse] = []
        total_xp = 0
        highest_lvl = 1

        for b in branches:
            total_xp += b.xp
            if b.level > highest_lvl:
                highest_lvl = b.level
            xp_next = calculate_xp_for_next_level(b.xp)
            responses.append(
                SkillProgressResponse(
                    skill_category=b.skill_category,
                    xp=b.xp,
                    level=b.level,
                    completed_quest_count=b.completed_quest_count,
                    xp_for_next_level=xp_next,
                    unlocked_categories=b.unlocked_categories,
                    updated_at=b.updated_at,
                )
            )

        return SkillTreeResponse(
            branches=responses,
            total_xp=total_xp,
            highest_level=highest_lvl,
        )

    async def get_branch_progress(
        self, user_id: str, skill_category: SkillCategory
    ) -> SkillProgressResponse:
        b = await self.skill_repo.get_progress(user_id, skill_category.value)
        xp_next = calculate_xp_for_next_level(b.xp)
        return SkillProgressResponse(
            skill_category=b.skill_category,
            xp=b.xp,
            level=b.level,
            completed_quest_count=b.completed_quest_count,
            xp_for_next_level=xp_next,
            unlocked_categories=b.unlocked_categories,
            updated_at=b.updated_at,
        )

    async def get_branch_history(
        self, user_id: str, skill_category: SkillCategory, skip: int = 0, limit: int = 20
    ) -> List[SkillHistoryItemResponse]:
        completions, _ = await self.completion_repo.list_user_completions(
            user_id, skip=skip, limit=limit
        )
        history = []
        for c in completions:
            quest = await self.quest_repo.get_by_id(c.quest_id)
            if quest and quest.skill_category == skill_category and c.completed_at:
                history.append(
                    SkillHistoryItemResponse(
                        quest_id=quest.id,
                        quest_title=quest.title,
                        difficulty=quest.difficulty.value,
                        completed_at=c.completed_at,
                        xp_awarded=c.xp_awarded,
                    )
                )
        return history
