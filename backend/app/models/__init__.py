"""Domain data models and enums for TerraQuest."""

from app.models.enums import (
    DiscoveryVisibility,
    MapVisibility,
    QuestDifficulty,
    QuestStatus,
    SharePermission,
    SkillCategory,
)
from app.models.user import UserModel
from app.models.exploration_map import ExplorationMapModel
from app.models.exploration_cell import ExplorationCellModel
from app.models.discovery import DiscoveryModel
from app.models.quest import QuestModel, QuestCompletionModel
from app.models.skill_progress import (
    SkillProgressModel,
    calculate_level,
    calculate_xp_for_next_level,
)
from app.models.share import MapShareModel

__all__ = [
    "DiscoveryVisibility",
    "MapVisibility",
    "QuestDifficulty",
    "QuestStatus",
    "SharePermission",
    "SkillCategory",
    "UserModel",
    "ExplorationMapModel",
    "ExplorationCellModel",
    "DiscoveryModel",
    "QuestModel",
    "QuestCompletionModel",
    "SkillProgressModel",
    "calculate_level",
    "calculate_xp_for_next_level",
    "MapShareModel",
]
