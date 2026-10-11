from typing import Any, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.db.mongo import get_db
from app.models.user import UserModel
from app.repositories import (
    CellRepository,
    CompletionRepository,
    DiscoveryRepository,
    MapRepository,
    QuestRepository,
    ShareRepository,
    SkillRepository,
    UserRepository,
)
from app.services import (
    AuthService,
    DiscoveryService,
    ExplorationService,
    MapService,
    QuestService,
    SharingService,
    SkillService,
    SyncService,
)

security_scheme = HTTPBearer(auto_error=False)


# Database
def get_database_dep() -> Any:
    return get_db()


# Repositories
def get_user_repo(db: Any = Depends(get_database_dep)) -> UserRepository:
    return UserRepository(db)


def get_map_repo(db: Any = Depends(get_database_dep)) -> MapRepository:
    return MapRepository(db)


def get_cell_repo(db: Any = Depends(get_database_dep)) -> CellRepository:
    return CellRepository(db)


def get_discovery_repo(db: Any = Depends(get_database_dep)) -> DiscoveryRepository:
    return DiscoveryRepository(db)


def get_quest_repo(db: Any = Depends(get_database_dep)) -> QuestRepository:
    return QuestRepository(db)


def get_completion_repo(db: Any = Depends(get_database_dep)) -> CompletionRepository:
    return CompletionRepository(db)


def get_skill_repo(db: Any = Depends(get_database_dep)) -> SkillRepository:
    return SkillRepository(db)


def get_share_repo(db: Any = Depends(get_database_dep)) -> ShareRepository:
    return ShareRepository(db)


# Services
def get_auth_service(user_repo: UserRepository = Depends(get_user_repo)) -> AuthService:
    return AuthService(user_repo)


def get_discovery_service(
    discovery_repo: DiscoveryRepository = Depends(get_discovery_repo),
    map_repo: MapRepository = Depends(get_map_repo),
) -> DiscoveryService:
    return DiscoveryService(discovery_repo, map_repo)


def get_map_service(
    map_repo: MapRepository = Depends(get_map_repo),
    cell_repo: CellRepository = Depends(get_cell_repo),
    discovery_repo: DiscoveryRepository = Depends(get_discovery_repo),
) -> MapService:
    return MapService(map_repo, cell_repo, discovery_repo)


def get_quest_service(
    quest_repo: QuestRepository = Depends(get_quest_repo),
    completion_repo: CompletionRepository = Depends(get_completion_repo),
    skill_repo: SkillRepository = Depends(get_skill_repo),
    discovery_service: DiscoveryService = Depends(get_discovery_service),
    map_repo: MapRepository = Depends(get_map_repo),
) -> QuestService:
    return QuestService(quest_repo, completion_repo, skill_repo, discovery_service, map_repo)


def get_skill_service(
    skill_repo: SkillRepository = Depends(get_skill_repo),
    completion_repo: CompletionRepository = Depends(get_completion_repo),
    quest_repo: QuestRepository = Depends(get_quest_repo),
) -> SkillService:
    return SkillService(skill_repo, completion_repo, quest_repo)


def get_sharing_service(
    share_repo: ShareRepository = Depends(get_share_repo),
    map_repo: MapRepository = Depends(get_map_repo),
    discovery_repo: DiscoveryRepository = Depends(get_discovery_repo),
) -> SharingService:
    return SharingService(share_repo, map_repo, discovery_repo)


def get_exploration_service(
    cell_repo: CellRepository = Depends(get_cell_repo),
    discovery_repo: DiscoveryRepository = Depends(get_discovery_repo),
    completion_repo: CompletionRepository = Depends(get_completion_repo),
    skill_repo: SkillRepository = Depends(get_skill_repo),
    map_repo: MapRepository = Depends(get_map_repo),
) -> ExplorationService:
    return ExplorationService(cell_repo, discovery_repo, completion_repo, skill_repo, map_repo)


def get_sync_service(
    discovery_repo: DiscoveryRepository = Depends(get_discovery_repo),
    map_repo: MapRepository = Depends(get_map_repo),
    cell_repo: CellRepository = Depends(get_cell_repo),
) -> SyncService:
    return SyncService(discovery_repo, map_repo, cell_repo)


# User Authentication Dependency
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
) -> UserModel:
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Authentication credentials (Bearer token) are missing.")

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise UnauthorizedError("Invalid or expired authentication token.")

    user = await user_repo.get_by_id(payload["sub"])
    if not user:
        raise UnauthorizedError("User associated with token no longer exists.")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
) -> Optional[UserModel]:
    """Allows guest users to interact with public endpoints while authenticating users if provided."""
    if not credentials or not credentials.credentials:
        return None

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None

    return await user_repo.get_by_id(payload["sub"])
