from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.quest import QuestModel


class AIProvider(ABC):
    """Abstract interface for Quest and Reflection generation providers."""

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider is online and ready."""
        pass

    @abstractmethod
    async def generate_quest(
        self,
        skill_category: SkillCategory,
        difficulty: QuestDifficulty,
        duration_minutes: int,
        user_interests: List[str],
    ) -> QuestModel:
        """Generate a structured quest object."""
        pass

    @abstractmethod
    async def generate_reflection(
        self,
        observation: str,
        personal_reflection: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> str:
        """Generate a supportive reflection prompt based on user observation."""
        pass

    @abstractmethod
    async def generate_follow_up(
        self,
        quest_title: str,
        observation: str,
    ) -> Dict[str, Any]:
        """Generate a follow-up challenge."""
        pass

    @abstractmethod
    async def analyze_image(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> Dict[str, Any]:
        """Analyze an image using lightweight vision understanding (Moondream)."""
        pass

    @abstractmethod
    async def generate_quest_from_image(
        self,
        image_base64: str,
        skill_category: Optional[SkillCategory] = None,
        difficulty: Optional[QuestDifficulty] = None,
    ) -> Dict[str, Any]:
        """Generate an observation quest contextualized by an analyzed image."""
        pass
