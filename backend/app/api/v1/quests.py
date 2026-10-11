from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.dependencies import get_current_user, get_quest_service
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.user import UserModel
from app.schemas.common import ResponseEnvelope
from app.schemas.quest import (
    QuestCompletionRequest,
    QuestCompletionResponse,
    QuestResponse,
    QuestStartResponse,
    QuestStatusResponse,
)
from app.services.quest_service import QuestService

router = APIRouter(prefix="/quests", tags=["Quests & Progression"])


@router.get(
    "",
    response_model=ResponseEnvelope[List[QuestResponse]],
    summary="List available quests in catalog",
)
async def list_quests(
    skill_category: Optional[SkillCategory] = Query(None),
    difficulty: Optional[QuestDifficulty] = Query(None),
    quest_service: QuestService = Depends(get_quest_service),
):
    items = await quest_service.list_quests(
        skill_category=skill_category.value if skill_category else None,
        difficulty=difficulty.value if difficulty else None,
    )
    return ResponseEnvelope(data=items)


@router.get(
    "/signature",
    response_model=ResponseEnvelope[QuestResponse],
    summary="Retrieve the signature 'One Thing You Almost Missed' quest",
)
async def get_signature_quest(
    quest_service: QuestService = Depends(get_quest_service),
):
    quest = await quest_service.get_signature_quest()
    return ResponseEnvelope(data=quest)


@router.get(
    "/{quest_id}",
    response_model=ResponseEnvelope[QuestResponse],
    summary="Get quest details by ID",
)
async def get_quest(
    quest_id: str,
    quest_service: QuestService = Depends(get_quest_service),
):
    quest = await quest_service.get_quest(quest_id)
    return ResponseEnvelope(data=quest)


@router.post(
    "/{quest_id}/start",
    response_model=ResponseEnvelope[QuestStartResponse],
    summary="Start a quest",
)
async def start_quest(
    quest_id: str,
    current_user: UserModel = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service),
):
    result = await quest_service.start_quest(current_user.id, quest_id)
    return ResponseEnvelope(data=result)


@router.post(
    "/{quest_id}/complete",
    response_model=ResponseEnvelope[QuestCompletionResponse],
    summary="Complete a quest and claim rewards (Idempotent)",
)
async def complete_quest(
    quest_id: str,
    data: QuestCompletionRequest,
    current_user: UserModel = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service),
):
    result = await quest_service.complete_quest(current_user.id, quest_id, data)
    return ResponseEnvelope(data=result)


@router.get(
    "/{quest_id}/completion-status",
    response_model=ResponseEnvelope[QuestStatusResponse],
    summary="Check completion status of a quest for the current user",
)
async def get_completion_status(
    quest_id: str,
    current_user: UserModel = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service),
):
    status_info = await quest_service.get_completion_status(current_user.id, quest_id)
    return ResponseEnvelope(data=status_info)
