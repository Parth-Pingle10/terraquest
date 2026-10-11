"""API schemas for request validation and structured responses."""

from app.schemas.common import MessageResponse, ResponseEnvelope
from app.schemas.user import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.schemas.map import (
    CheckInRequest,
    CheckInResponse,
    ExplorationCellResponse,
    MapCreateRequest,
    MapResponse,
    MapStatisticsResponse,
    MapUpdateRequest,
)
from app.schemas.discovery import (
    DiscoveryCreateRequest,
    DiscoveryPublicResponse,
    DiscoveryResponse,
    DiscoveryUpdateRequest,
)
from app.schemas.quest import (
    QuestCompletionRequest,
    QuestCompletionResponse,
    QuestResponse,
    QuestStartResponse,
    QuestStatusResponse,
)
from app.schemas.skill import (
    SkillHistoryItemResponse,
    SkillProgressResponse,
    SkillTreeResponse,
)
from app.schemas.sharing import (
    CreateShareRequest,
    ShareResponse,
    ShareSummaryResponse,
    SharedDiscoveryPublicView,
    SharedMapPublicView,
)
from app.schemas.ai import (
    AIStatusResponse,
    FollowUpRequest,
    FollowUpResponse,
    QuestGenerateRequest,
    QuestRecommendRequest,
    ReflectionRequest,
    ReflectionResponse,
)
from app.schemas.sync import (
    ClientDiscoverySyncItem,
    ClientExplorationSyncItem,
    SyncDiscoveriesRequest,
    SyncDiscoveriesResponse,
    SyncExplorationRequest,
    SyncExplorationResponse,
)

__all__ = [
    "MessageResponse",
    "ResponseEnvelope",
    "TokenResponse",
    "UserLoginRequest",
    "UserRegisterRequest",
    "UserResponse",
    "UserUpdateRequest",
    "CheckInRequest",
    "CheckInResponse",
    "ExplorationCellResponse",
    "MapCreateRequest",
    "MapResponse",
    "MapStatisticsResponse",
    "MapUpdateRequest",
    "DiscoveryCreateRequest",
    "DiscoveryPublicResponse",
    "DiscoveryResponse",
    "DiscoveryUpdateRequest",
    "QuestCompletionRequest",
    "QuestCompletionResponse",
    "QuestResponse",
    "QuestStartResponse",
    "QuestStatusResponse",
    "SkillHistoryItemResponse",
    "SkillProgressResponse",
    "SkillTreeResponse",
    "CreateShareRequest",
    "ShareResponse",
    "ShareSummaryResponse",
    "SharedDiscoveryPublicView",
    "SharedMapPublicView",
    "AIStatusResponse",
    "FollowUpRequest",
    "FollowUpResponse",
    "QuestGenerateRequest",
    "QuestRecommendRequest",
    "ReflectionRequest",
    "ReflectionResponse",
    "ClientDiscoverySyncItem",
    "ClientExplorationSyncItem",
    "SyncDiscoveriesRequest",
    "SyncDiscoveriesResponse",
    "SyncExplorationRequest",
    "SyncExplorationResponse",
]
