import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import MapVisibility


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ExplorationMapModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    title: str
    description: str = ""
    map_visibility: MapVisibility = Field(default=MapVisibility.PRIVATE)
    discovered_cells_count: int = Field(default=0)
    region_name: Optional[str] = None
    region_grid_cells: int = Field(
        default=100,
        description="Documented denominator for calculating exploration percentage in the chosen region/grid",
    )
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
