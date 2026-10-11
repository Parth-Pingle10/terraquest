import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import QuestDifficulty, QuestStatus, SkillCategory


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class QuestModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    skill_category: SkillCategory
    duration_minutes: int = Field(default=15, ge=1, le=180)
    difficulty: QuestDifficulty = Field(default=QuestDifficulty.BEGINNER)
    instructions: str
    reflection_questions: List[str] = Field(default_factory=list)
    completion_criteria: str
    optional_follow_up_prompt: Optional[str] = None
    generation_source: str = Field(default="seed", description="Source: seed, ai, custom")
    active: bool = True
    created_at: datetime = Field(default_factory=utc_now)


class QuestCompletionModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    quest_id: str
    optional_discovery_id: Optional[str] = None
    status: QuestStatus = Field(default=QuestStatus.STARTED)
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = None
    xp_awarded: int = 0
    reward_claimed: bool = False
    optional_reflection: Optional[str] = None
