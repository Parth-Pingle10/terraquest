from enum import Enum


class SkillCategory(str, Enum):
    VISUAL_EXPLORER = "visual_explorer"
    NATURE_TRACKER = "nature_tracker"
    SOUND_HUNTER = "sound_hunter"
    URBAN_EXPLORER = "urban_explorer"


class QuestDifficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class MapVisibility(str, Enum):
    PRIVATE = "private"
    UNLISTED = "unlisted"
    PUBLIC = "public"


class DiscoveryVisibility(str, Enum):
    PRIVATE = "private"
    SHARED = "shared"
    PUBLIC = "public"


class SharePermission(str, Enum):
    VIEW = "view"


class QuestStatus(str, Enum):
    STARTED = "started"
    COMPLETED = "completed"
