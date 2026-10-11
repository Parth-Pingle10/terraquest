from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import QuestDifficulty, SkillCategory


class AIStatusResponse(BaseModel):
    ollama_reachable: bool
    model_available: bool
    active_provider: str
    configured_model: str


class QuestGenerateRequest(BaseModel):
    skill_category: Optional[SkillCategory] = None
    difficulty: Optional[QuestDifficulty] = None
    user_interests: Optional[List[str]] = Field(default_factory=list)
    duration_minutes: Optional[int] = Field(default=15, ge=5, le=180)


class QuestRecommendRequest(BaseModel):
    user_interests: Optional[List[str]] = Field(default_factory=list)
    exclude_quest_ids: Optional[List[str]] = Field(default_factory=list)


class ReflectionRequest(BaseModel):
    observation: str = Field(min_length=1, max_length=3000)
    personal_reflection: Optional[str] = Field(default="", max_length=5000)
    skill_category: Optional[SkillCategory] = None


class ReflectionResponse(BaseModel):
    reflection_text: str
    source: str = Field(description="'ollama' or 'deterministic'")


class FollowUpRequest(BaseModel):
    quest_id: str
    observation: str = Field(min_length=1, max_length=3000)


class FollowUpResponse(BaseModel):
    follow_up_prompt: str
    suggested_skill: SkillCategory
    source: str
