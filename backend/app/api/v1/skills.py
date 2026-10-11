from typing import List
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_current_user, get_skill_service
from app.models.enums import SkillCategory
from app.models.user import UserModel
from app.schemas.common import ResponseEnvelope
from app.schemas.skill import (
    SkillHistoryItemResponse,
    SkillProgressResponse,
    SkillTreeResponse,
)
from app.services.skill_service import SkillService

router = APIRouter(prefix="/skills", tags=["Skill Tree & XP Progression"])


@router.get(
    "",
    response_model=ResponseEnvelope[SkillTreeResponse],
    summary="Get user skill tree and branches",
)
async def get_skill_tree(
    current_user: UserModel = Depends(get_current_user),
    skill_service: SkillService = Depends(get_skill_service),
):
    tree = await skill_service.get_tree(current_user.id)
    return ResponseEnvelope(data=tree)


@router.get(
    "/progress",
    response_model=ResponseEnvelope[SkillTreeResponse],
    summary="Alias for overall skill progress",
)
async def get_skill_progress(
    current_user: UserModel = Depends(get_current_user),
    skill_service: SkillService = Depends(get_skill_service),
):
    tree = await skill_service.get_tree(current_user.id)
    return ResponseEnvelope(data=tree)


@router.get(
    "/{skill_category}",
    response_model=ResponseEnvelope[SkillProgressResponse],
    summary="Get progression details for a specific skill branch",
)
async def get_skill_branch(
    skill_category: SkillCategory,
    current_user: UserModel = Depends(get_current_user),
    skill_service: SkillService = Depends(get_skill_service),
):
    branch = await skill_service.get_branch_progress(current_user.id, skill_category)
    return ResponseEnvelope(data=branch)


@router.get(
    "/{skill_category}/history",
    response_model=ResponseEnvelope[List[SkillHistoryItemResponse]],
    summary="Get completion history for a skill branch",
)
async def get_skill_history(
    skill_category: SkillCategory,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    skill_service: SkillService = Depends(get_skill_service),
):
    skip = (page - 1) * limit
    history = await skill_service.get_branch_history(
        current_user.id, skill_category, skip=skip, limit=limit
    )
    return ResponseEnvelope(data=history)
