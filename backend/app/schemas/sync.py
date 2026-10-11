from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import DiscoveryVisibility, SkillCategory


class ClientDiscoverySyncItem(BaseModel):
    client_id: str = Field(description="Client-generated stable UUID")
    map_id: str
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=2000)
    observation: str = Field(min_length=1, max_length=3000)
    personal_reflection: str = Field(default="", max_length=5000)
    optional_photo_reference: Optional[str] = None
    photo_approved_for_sharing: bool = False
    skill_category: SkillCategory = Field(default=SkillCategory.VISUAL_EXPLORER)
    optional_quest_id: Optional[str] = None
    optional_location_name: Optional[str] = None
    optional_latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    optional_longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    optional_cell_id: Optional[str] = None
    visibility: DiscoveryVisibility = Field(default=DiscoveryVisibility.PRIVATE)
    client_updated_at: datetime


class SyncDiscoveriesRequest(BaseModel):
    discoveries: List[ClientDiscoverySyncItem] = Field(default_factory=list)


class SyncDiscoveriesResponse(BaseModel):
    synced_count: int
    conflicts_resolved: int
    synced_ids: List[str]


class ClientExplorationSyncItem(BaseModel):
    map_id: str
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    manual_cell_id: Optional[str] = None
    visited_at: datetime


class SyncExplorationRequest(BaseModel):
    cells: List[ClientExplorationSyncItem] = Field(default_factory=list)


class SyncExplorationResponse(BaseModel):
    synced_cells_count: int
    new_cells_count: int
