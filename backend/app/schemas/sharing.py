from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import SharePermission, SkillCategory


class CreateShareRequest(BaseModel):
    permission: SharePermission = Field(default=SharePermission.VIEW)
    include_discovery_titles: bool = Field(default=True)
    include_discovery_descriptions: bool = Field(default=True)
    include_approved_photos: bool = Field(
        default=False,
        description="Include only photos explicitly approved for sharing by the user",
    )
    include_approximate_locations: bool = Field(
        default=False,
        description="Include rounded/approximate coordinates for discoveries",
    )
    expires_in_hours: Optional[int] = Field(default=168, ge=1, le=8760, description="Hours until token expires (default 7 days)")


class ShareResponse(BaseModel):
    share_id: str
    map_id: str
    share_token: str = Field(description="One-time returned plain token. Store securely; hash is saved on server.")
    share_path: str = Field(description="URL path for sharing with friends: /api/v1/shared/{share_token}")
    permission: SharePermission
    include_discovery_titles: bool
    include_discovery_descriptions: bool
    include_approved_photos: bool
    include_approximate_locations: bool
    expires_at: Optional[datetime] = None
    created_at: datetime


class ShareSummaryResponse(BaseModel):
    share_id: str
    map_id: str
    permission: SharePermission
    is_active: bool
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime


class SharedMapPublicView(BaseModel):
    map_id: str
    title: str
    description: str
    discovered_cells_count: int
    exploration_percentage: float
    created_at: datetime
    can_view_titles: bool
    can_view_descriptions: bool
    can_view_photos: bool
    can_view_locations: bool


class SharedDiscoveryPublicView(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    observation: str
    optional_photo_reference: Optional[str] = None
    skill_category: SkillCategory
    optional_location_name: Optional[str] = None
    approximate_latitude: Optional[float] = None
    approximate_longitude: Optional[float] = None
    created_at: datetime
