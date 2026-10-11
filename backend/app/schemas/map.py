from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, Field
from app.models.enums import MapVisibility


class MapCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    map_visibility: MapVisibility = Field(default=MapVisibility.PRIVATE)
    region_name: Optional[str] = Field(default=None, max_length=100)
    region_grid_cells: int = Field(
        default=100,
        ge=1,
        le=100000,
        description="Region cell denominator used for calculating percentage explored",
    )


class MapUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    map_visibility: Optional[MapVisibility] = None
    region_name: Optional[str] = None
    region_grid_cells: Optional[int] = Field(default=None, ge=1, le=100000)


class MapResponse(BaseModel):
    id: str
    owner_id: str
    title: str
    description: str
    map_visibility: MapVisibility
    discovered_cells_count: int
    region_name: Optional[str]
    region_grid_cells: int
    exploration_percentage: float = Field(
        description="Percentage of chosen exploration region grid explored (0.0 to 100.0)"
    )
    created_at: datetime
    updated_at: datetime


class MapStatisticsResponse(BaseModel):
    map_id: str
    discovered_cells_count: int
    region_name: Optional[str]
    region_grid_cells: int
    exploration_percentage: float
    total_discoveries: int
    created_at: datetime


class CheckInRequest(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    manual_cell_id: Optional[str] = Field(
        default=None,
        description="Explicit cell identifier for users who declined GPS permissions",
    )


class CheckInResponse(BaseModel):
    map_id: str
    cell_id: str
    is_new_cell: bool
    total_discovered_cells: int
    exploration_percentage: float
    cell_center: Optional[Dict[str, float]] = None


class ExplorationCellResponse(BaseModel):
    id: str
    map_id: str
    cell_id: str
    first_discovered_at: datetime
    last_visited_at: datetime
    cell_center: Optional[Dict[str, float]] = None
    discovery_count: int
