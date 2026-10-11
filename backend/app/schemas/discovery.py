from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import DiscoveryVisibility, SkillCategory


class DiscoveryCreateRequest(BaseModel):
    map_id: str
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=2000)
    observation: str = Field(min_length=1, max_length=3000, description="What the user observed in the real world")
    personal_reflection: str = Field(default="", max_length=5000, description="Private memory / reflection")
    optional_ai_reflection: Optional[str] = None
    optional_photo_reference: Optional[str] = Field(
        default=None,
        description="Local device photo reference (e.g. IndexedDB ID) or shared image URL",
    )
    photo_approved_for_sharing: bool = Field(
        default=False,
        description="Explicit user consent to share this photo reference with friends",
    )
    skill_category: SkillCategory = Field(default=SkillCategory.VISUAL_EXPLORER)
    optional_quest_id: Optional[str] = None
    optional_location_name: Optional[str] = None
    optional_latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    optional_longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    optional_cell_id: Optional[str] = None
    visibility: DiscoveryVisibility = Field(default=DiscoveryVisibility.PRIVATE)


class DiscoveryUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=2000)
    observation: Optional[str] = Field(default=None, min_length=1, max_length=3000)
    personal_reflection: Optional[str] = Field(default=None, max_length=5000)
    optional_photo_reference: Optional[str] = None
    photo_approved_for_sharing: Optional[bool] = None
    skill_category: Optional[SkillCategory] = None
    optional_location_name: Optional[str] = None
    visibility: Optional[DiscoveryVisibility] = None


class DiscoveryResponse(BaseModel):
    id: str
    owner_id: str
    map_id: str
    title: str
    description: str
    observation: str
    personal_reflection: str
    optional_ai_reflection: Optional[str] = None
    optional_photo_reference: Optional[str] = None
    photo_approved_for_sharing: bool
    skill_category: SkillCategory
    optional_quest_id: Optional[str] = None
    optional_location_name: Optional[str] = None
    optional_latitude: Optional[float] = None
    optional_longitude: Optional[float] = None
    optional_cell_id: Optional[str] = None
    visibility: DiscoveryVisibility
    created_at: datetime
    updated_at: datetime


class DiscoveryPublicResponse(BaseModel):
    """
    Sanitized discovery representation for shared and public map viewers.
    EXCLUDES: personal_reflection, exact coordinates, unapproved photo references.
    """
    id: str
    map_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    observation: str
    optional_photo_reference: Optional[str] = None
    skill_category: SkillCategory
    optional_location_name: Optional[str] = None
    approximate_latitude: Optional[float] = None
    approximate_longitude: Optional[float] = None
    created_at: datetime
