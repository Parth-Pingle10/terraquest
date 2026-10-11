import uuid
from datetime import datetime, timezone
from typing import Dict, Optional
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ExplorationCellModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    map_id: str
    cell_id: str  # Deterministic cell id, e.g. "cell_37.775_-122.419"
    owner_id: Optional[str] = None
    first_discovered_at: datetime = Field(default_factory=utc_now)
    last_visited_at: datetime = Field(default_factory=utc_now)
    cell_center: Optional[Dict[str, float]] = None
    discovery_count: int = Field(default=1)
