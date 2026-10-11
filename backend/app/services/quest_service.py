from datetime import datetime, timezone
from typing import List, Optional
from app.ai.quest_agent import quest_agent
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.enums import DiscoveryVisibility, QuestDifficulty, QuestStatus, SkillCategory
from app.models.quest import QuestCompletionModel, QuestModel
from app.repositories.completion_repository import CompletionRepository
from app.repositories.map_repository import MapRepository
from app.repositories.quest_repository import QuestRepository
from app.repositories.skill_repository import SkillRepository
from app.schemas.discovery import DiscoveryCreateRequest
from app.schemas.quest import (
    QuestCompletionRequest,
    QuestCompletionResponse,
    QuestResponse,
    QuestStartResponse,
    QuestStatusResponse,
)
from app.services.discovery_service import DiscoveryService

# Server-side XP policy
XP_BY_DIFFICULTY = {
    QuestDifficulty.BEGINNER: 10,
    QuestDifficulty.INTERMEDIATE: 20,
    QuestDifficulty.ADVANCED: 30,
}


class QuestService:
    def __init__(
        self,
        quest_repo: QuestRepository,
        completion_repo: CompletionRepository,
        skill_repo: SkillRepository,
        discovery_service: DiscoveryService,
        map_repo: MapRepository,
    ) -> None:
        self.quest_repo = quest_repo
        self.completion_repo = completion_repo
        self.skill_repo = skill_repo
        self.discovery_service = discovery_service
        self.map_repo = map_repo

    async def list_quests(
        self,
        skill_category: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> List[QuestResponse]:
        quests = await self.quest_repo.list_quests(
            skill_category=skill_category,
            difficulty=difficulty,
            active_only=True,
        )
        return [self._to_quest_response(q) for q in quests]

    async def get_quest(self, quest_id: str) -> QuestResponse:
        quest = await self.quest_repo.get_by_id(quest_id)
        if not quest:
            raise NotFoundError("Quest", quest_id)
        return self._to_quest_response(quest)

    async def get_signature_quest(self) -> QuestResponse:
        """Retrieve the signature 'One Thing You Almost Missed' quest."""
        quests = await self.quest_repo.list_quests(active_only=False)
        for q in quests:
            if "almost missed" in q.title.lower():
                return self._to_quest_response(q)
        
        # If not found in DB yet, query deterministic templates or seed
        from app.ai.deterministic_provider import CURATED_DETERMINISTIC_QUESTS
        sig = CURATED_DETERMINISTIC_QUESTS[0]
        quest_obj = QuestModel(
            title=sig["title"],
            description=sig["description"],
            skill_category=sig["skill_category"],
            duration_minutes=sig["duration_minutes"],
            difficulty=sig["difficulty"],
            instructions=sig["instructions"],
            reflection_questions=sig["reflection_questions"],
            completion_criteria=sig["completion_criteria"],
            optional_follow_up_prompt=sig.get("optional_follow_up_prompt"),
            generation_source="seed",
        )
        created = await self.quest_repo.create(quest_obj)
        return self._to_quest_response(created)

    async def start_quest(self, user_id: str, quest_id: str) -> QuestStartResponse:
        quest = await self.quest_repo.get_by_id(quest_id)
        if not quest:
            raise NotFoundError("Quest", quest_id)

        # Check existing active or completed record
        existing = await self.completion_repo.get_by_user_and_quest(user_id, quest_id)
        if existing and existing.status == QuestStatus.STARTED:
            return QuestStartResponse(
                completion_id=existing.id,
                quest_id=quest.id,
                title=quest.title,
                instructions=quest.instructions,
                reflection_questions=quest.reflection_questions,
                status=existing.status,
                started_at=existing.started_at,
            )

        now = datetime.now(timezone.utc)
        completion = QuestCompletionModel(
            user_id=user_id,
            quest_id=quest.id,
            status=QuestStatus.STARTED,
            started_at=now,
        )
        created = await self.completion_repo.create(completion)

        return QuestStartResponse(
            completion_id=created.id,
            quest_id=quest.id,
            title=quest.title,
            instructions=quest.instructions,
            reflection_questions=quest.reflection_questions,
            status=created.status,
            started_at=created.started_at,
        )

    async def complete_quest(
        self, user_id: str, quest_id: str, data: QuestCompletionRequest
    ) -> QuestCompletionResponse:
        """
        Complete a quest, award skill XP idempotently, optionally create a discovery,
        and generate an AI reflection.
        """
        quest = await self.quest_repo.get_by_id(quest_id)
        if not quest:
            raise NotFoundError("Quest", quest_id)

        existing = await self.completion_repo.get_by_user_and_quest(user_id, quest_id)

        # Idempotency check: if already completed and reward already claimed, do NOT duplicate XP!
        if existing and existing.status == QuestStatus.COMPLETED and existing.reward_claimed:
            progress = await self.skill_repo.get_progress(user_id, quest.skill_category.value)
            return QuestCompletionResponse(
                completion_id=existing.id,
                quest_id=quest.id,
                status=existing.status,
                xp_awarded=0,  # Zero additional XP on repeated duplicate completion
                reward_claimed=True,
                discovery_id=existing.optional_discovery_id,
                ai_reflection=None,
                follow_up_prompt=quest.optional_follow_up_prompt,
                skill_category=quest.skill_category,
                new_skill_level=progress.level,
                total_skill_xp=progress.xp,
            )

        now = datetime.now(timezone.utc)
        xp_to_award = XP_BY_DIFFICULTY.get(quest.difficulty, 10)

        # Generate AI reflection on observation
        ai_res = await quest_agent.generate_reflection(
            observation=data.observation,
            personal_reflection=data.reflection,
            skill_category=quest.skill_category,
        )
        ai_reflection_text = ai_res.get("reflection_text")

        # Award XP and update level on the server
        progress = await self.skill_repo.add_xp(user_id, quest.skill_category.value, xp_to_award)

        # Optionally save a discovery
        discovery_id = None
        if data.create_discovery and data.map_id:
            try:
                disc_req = DiscoveryCreateRequest(
                    map_id=data.map_id,
                    title=f"Discovery: {quest.title}",
                    description=f"Completed quest '{quest.title}'",
                    observation=data.observation,
                    personal_reflection=data.reflection or "",
                    optional_ai_reflection=ai_reflection_text,
                    optional_photo_reference=data.photo_reference,
                    skill_category=quest.skill_category,
                    optional_quest_id=quest.id,
                    optional_latitude=data.latitude,
                    optional_longitude=data.longitude,
                    visibility=DiscoveryVisibility.PRIVATE,
                )
                saved_disc = await self.discovery_service.create_discovery(user_id, disc_req)
                discovery_id = saved_disc.id
            except Exception:
                # Failure in discovery creation must not corrupt progression
                pass

        # Update or create completion record
        if existing:
            updated_completion = await self.completion_repo.update(
                existing.id,
                {
                    "status": QuestStatus.COMPLETED.value,
                    "completed_at": now,
                    "xp_awarded": xp_to_award,
                    "reward_claimed": True,
                    "optional_discovery_id": discovery_id,
                    "optional_reflection": data.reflection,
                },
            )
            comp_id = updated_completion.id if updated_completion else existing.id
        else:
            new_comp = QuestCompletionModel(
                user_id=user_id,
                quest_id=quest.id,
                status=QuestStatus.COMPLETED,
                started_at=now,
                completed_at=now,
                xp_awarded=xp_to_award,
                reward_claimed=True,
                optional_discovery_id=discovery_id,
                optional_reflection=data.reflection,
            )
            created_comp = await self.completion_repo.create(new_comp)
            comp_id = created_comp.id

        return QuestCompletionResponse(
            completion_id=comp_id,
            quest_id=quest.id,
            status=QuestStatus.COMPLETED,
            xp_awarded=xp_to_award,
            reward_claimed=True,
            discovery_id=discovery_id,
            ai_reflection=ai_reflection_text,
            follow_up_prompt=quest.optional_follow_up_prompt,
            skill_category=quest.skill_category,
            new_skill_level=progress.level,
            total_skill_xp=progress.xp,
        )

    async def get_completion_status(self, user_id: str, quest_id: str) -> QuestStatusResponse:
        completion = await self.completion_repo.get_by_user_and_quest(user_id, quest_id)
        if not completion:
            return QuestStatusResponse(quest_id=quest_id, status=None, reward_claimed=False, xp_awarded=0)

        return QuestStatusResponse(
            quest_id=quest_id,
            status=completion.status,
            completed_at=completion.completed_at,
            reward_claimed=completion.reward_claimed,
            xp_awarded=completion.xp_awarded,
        )

    def _to_quest_response(self, q: QuestModel) -> QuestResponse:
        return QuestResponse(
            id=q.id,
            title=q.title,
            description=q.description,
            skill_category=q.skill_category,
            duration_minutes=q.duration_minutes,
            difficulty=q.difficulty,
            instructions=q.instructions,
            reflection_questions=q.reflection_questions,
            completion_criteria=q.completion_criteria,
            optional_follow_up_prompt=q.optional_follow_up_prompt,
            generation_source=q.generation_source,
            active=q.active,
            created_at=q.created_at,
        )
