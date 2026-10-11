import uuid
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field
from app.models.enums import SkillCategory


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def calculate_level(xp: int) -> int:
    """Deterministic level progression formula: every 50 XP grants a level."""
    if xp <= 0:
        return 1
    return 1 + (xp // 50)


def calculate_xp_for_next_level(xp: int) -> int:
    """Calculate remaining XP to reach the next level."""
    current_lvl = calculate_level(xp)
    threshold_for_next = current_lvl * 50
    return max(0, threshold_for_next - xp)


class SkillProgressModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    skill_category: SkillCategory
    xp: int = Field(default=0, ge=0)
    level: int = Field(default=1, ge=1)
    completed_quest_count: int = Field(default=0, ge=0)
    unlocked_categories: List[str] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=utc_now)
