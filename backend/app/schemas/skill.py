from datetime import datetime
from typing import List
from pydantic import BaseModel
from app.models.enums import SkillCategory


class SkillProgressResponse(BaseModel):
    skill_category: SkillCategory
    xp: int
    level: int
    completed_quest_count: int
    xp_for_next_level: int
    unlocked_categories: List[str]
    updated_at: datetime


class SkillTreeResponse(BaseModel):
    branches: List[SkillProgressResponse]
    total_xp: int
    highest_level: int


class SkillHistoryItemResponse(BaseModel):
    quest_id: str
    quest_title: str
    difficulty: str
    completed_at: datetime
    xp_awarded: int
