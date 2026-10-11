from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import QuestDifficulty, QuestStatus, SkillCategory


class QuestResponse(BaseModel):
    id: str
    title: str
    description: str
    skill_category: SkillCategory
    duration_minutes: int
    difficulty: QuestDifficulty
    instructions: str
    reflection_questions: List[str]
    completion_criteria: str
    optional_follow_up_prompt: Optional[str] = None
    generation_source: str
    active: bool
    created_at: datetime


class QuestStartResponse(BaseModel):
    completion_id: str
    quest_id: str
    title: str
    instructions: str
    reflection_questions: List[str]
    status: QuestStatus
    started_at: datetime


class QuestCompletionRequest(BaseModel):
    observation: str = Field(min_length=1, max_length=3000, description="What the user observed")
    reflection: Optional[str] = Field(default="", max_length=5000, description="User reflection response")
    photo_reference: Optional[str] = Field(default=None, description="Optional photo reference or URL")
    map_id: Optional[str] = Field(default=None, description="Optional map to save discovery to")
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    create_discovery: bool = Field(default=True, description="Whether to automatically save a discovery")


class QuestCompletionResponse(BaseModel):
    completion_id: str
    quest_id: str
    status: QuestStatus
    xp_awarded: int
    reward_claimed: bool
    discovery_id: Optional[str] = None
    ai_reflection: Optional[str] = None
    follow_up_prompt: Optional[str] = None
    skill_category: SkillCategory
    new_skill_level: int
    total_skill_xp: int


class QuestStatusResponse(BaseModel):
    quest_id: str
    status: Optional[QuestStatus] = None
    completed_at: Optional[datetime] = None
    reward_claimed: bool = False
    xp_awarded: int = 0
