import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import SharePermission


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MapShareModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    map_id: str
    owner_id: str
    token_hash: str = Field(description="SHA-256 hash of share token. Plaintext token is never stored.")
    permission: SharePermission = Field(default=SharePermission.VIEW)
    include_discovery_titles: bool = Field(default=True)
    include_discovery_descriptions: bool = Field(default=True)
    include_approved_photos: bool = Field(default=False)
    include_approximate_locations: bool = Field(default=False)
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utc_now)

    @property
    def is_active(self) -> bool:
        if self.revoked_at is not None:
            return False
        if self.expires_at is not None:
            exp = self.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < utc_now():
                return False
        return True
