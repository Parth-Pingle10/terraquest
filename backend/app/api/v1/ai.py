from typing import Optional
from fastapi import APIRouter, Depends
from app.ai.quest_agent import quest_agent
from app.api.dependencies import get_current_user_optional
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.user import UserModel
from app.schemas.ai import (
    AIStatusResponse,
    FollowUpRequest,
    FollowUpResponse,
    QuestGenerateRequest,
    QuestRecommendRequest,
    ReflectionRequest,
    ReflectionResponse,
)
from app.schemas.common import ResponseEnvelope
from app.schemas.quest import QuestResponse

router = APIRouter(prefix="/ai", tags=["AI Side-Quest Agent"])


@router.get(
    "/status",
    response_model=ResponseEnvelope[AIStatusResponse],
    summary="Check local AI engine and model availability",
)
async def get_ai_status():
    status_data = await quest_agent.get_status()
    return ResponseEnvelope(data=AIStatusResponse(**status_data))


@router.post(
    "/quests/generate",
    response_model=ResponseEnvelope[QuestResponse],
    summary="Generate a custom AI side-quest (uses local Ollama with deterministic fallback)",
)
async def generate_quest(
    data: QuestGenerateRequest,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
):
    interests = data.user_interests or (current_user.interests if current_user else [])
    category = data.skill_category or quest_agent.recommend_skill_branch(interests)
    difficulty = data.difficulty or (current_user.preferred_difficulty if current_user else QuestDifficulty.BEGINNER)
    duration = data.duration_minutes or (current_user.preferred_quest_duration if current_user else 15)

    quest = await quest_agent.generate_quest(
        skill_category=category,
        difficulty=difficulty,
        duration_minutes=duration,
        user_interests=interests,
    )
    res = QuestResponse(
        id=quest.id,
        title=quest.title,
        description=quest.description,
        skill_category=quest.skill_category,
        duration_minutes=quest.duration_minutes,
        difficulty=quest.difficulty,
        instructions=quest.instructions,
        reflection_questions=quest.reflection_questions,
        completion_criteria=quest.completion_criteria,
        optional_follow_up_prompt=quest.optional_follow_up_prompt,
        generation_source=quest.generation_source,
        active=quest.active,
        created_at=quest.created_at,
    )
    return ResponseEnvelope(data=res)


@router.post(
    "/quests/recommend",
    response_model=ResponseEnvelope[dict],
    summary="Recommend a quest branch and starting prompt based on user interests",
)
async def recommend_quest(
    data: QuestRecommendRequest,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
):
    interests = data.user_interests or (current_user.interests if current_user else [])
    recommended_branch = quest_agent.recommend_skill_branch(interests)
    difficulty = current_user.preferred_difficulty if current_user else QuestDifficulty.BEGINNER
    duration = current_user.preferred_quest_duration if current_user else 15

    quest = await quest_agent.generate_quest(
        skill_category=recommended_branch,
        difficulty=difficulty,
        duration_minutes=duration,
        user_interests=interests,
    )

    return ResponseEnvelope(
        data={
            "recommended_branch": recommended_branch.value,
            "reason": f"Matches your interest profile: {', '.join(interests) if interests else 'open exploration'}",
            "quest": QuestResponse(
                id=quest.id,
                title=quest.title,
                description=quest.description,
                skill_category=quest.skill_category,
                duration_minutes=quest.duration_minutes,
                difficulty=quest.difficulty,
                instructions=quest.instructions,
                reflection_questions=quest.reflection_questions,
                completion_criteria=quest.completion_criteria,
                optional_follow_up_prompt=quest.optional_follow_up_prompt,
                generation_source=quest.generation_source,
                active=quest.active,
                created_at=quest.created_at,
            ).model_dump(),
        }
    )


@router.post(
    "/reflections",
    response_model=ResponseEnvelope[ReflectionResponse],
    summary="Generate supportive AI reflection on user observation",
)
async def generate_reflection(data: ReflectionRequest):
    result = await quest_agent.generate_reflection(
        observation=data.observation,
        personal_reflection=data.personal_reflection,
        skill_category=data.skill_category,
    )
    return ResponseEnvelope(data=ReflectionResponse(**result))


@router.post(
    "/quests/follow-up",
    response_model=ResponseEnvelope[FollowUpResponse],
    summary="Generate follow-up quest challenge",
)
async def generate_follow_up(data: FollowUpRequest):
    result = await quest_agent.generate_follow_up(data.quest_id, data.observation)
    return ResponseEnvelope(data=FollowUpResponse(**result))
