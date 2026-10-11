from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import QuestDifficulty


class UserRegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, description="Unique username")
    password: str = Field(min_length=6, max_length=128, description="User password")
    display_name: Optional[str] = Field(default=None, max_length=100)
    interests: List[str] = Field(default_factory=list, description="Personal exploration interests")
    preferred_quest_duration: int = Field(default=15, ge=5, le=180)
    preferred_difficulty: QuestDifficulty = Field(default=QuestDifficulty.BEGINNER)


class UserLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    interests: List[str]
    preferred_quest_duration: int
    preferred_difficulty: QuestDifficulty
    created_at: datetime


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    interests: Optional[List[str]] = None
    preferred_quest_duration: Optional[int] = Field(default=None, ge=5, le=180)
    preferred_difficulty: Optional[QuestDifficulty] = None
