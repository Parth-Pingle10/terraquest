import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import DiscoveryVisibility, SkillCategory


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DiscoveryModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    map_id: str
    title: str
    description: str = ""
    observation: str = Field(description="What the user observed in the real world")
    personal_reflection: str = Field(default="", description="Private memory/reflection")
    optional_ai_reflection: Optional[str] = None
    optional_photo_reference: Optional[str] = Field(
        default=None,
        description="Browser-local photo reference (e.g. local ID) or explicitly authorized media reference. Never exposes unshared local media.",
    )
    photo_approved_for_sharing: bool = Field(
        default=False,
        description="Whether the user explicitly approved this photo reference to be visible in shared maps.",
    )
    skill_category: SkillCategory = Field(default=SkillCategory.VISUAL_EXPLORER)
    optional_quest_id: Optional[str] = None
    optional_location_name: Optional[str] = None
    optional_latitude: Optional[float] = None
    optional_longitude: Optional[float] = None
    optional_cell_id: Optional[str] = None
    visibility: DiscoveryVisibility = Field(default=DiscoveryVisibility.PRIVATE)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
