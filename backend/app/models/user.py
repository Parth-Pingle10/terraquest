import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import QuestDifficulty


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    display_name: str
    interests: List[str] = Field(default_factory=list)
    preferred_quest_duration: int = Field(default=15, description="Preferred duration in minutes")
    preferred_difficulty: QuestDifficulty = Field(default=QuestDifficulty.BEGINNER)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
