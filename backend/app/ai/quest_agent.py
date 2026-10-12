from typing import Any, Dict, List, Optional
from app.ai.deterministic_provider import DeterministicQuestProvider
from app.ai.ollama_provider import OllamaProvider
from app.core.config import settings
from app.core.logging import logger
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.quest import QuestModel


class QuestAgent:
    """
    High-level orchestrator that interfaces with Moondream via Ollama
    and falls back to DeterministicQuestProvider if Ollama is offline,
    unconfigured, or resource-constrained.
    """

    def __init__(
        self,
        ollama_provider: Optional[OllamaProvider] = None,
        deterministic_provider: Optional[DeterministicQuestProvider] = None,
    ) -> None:
        self.ollama = ollama_provider or OllamaProvider()
        self.deterministic = deterministic_provider or DeterministicQuestProvider()

    async def get_status(self) -> Dict[str, Any]:
        """Report connectivity and active provider status without leaking sensitive host info."""
        ollama_reachable = await self.ollama.is_available()
        model_available = await self.ollama.is_model_installed() if ollama_reachable else False
        vision_available = (
            model_available and settings.ENABLE_VISION_MODEL
            if ollama_reachable
            else False
        )
        active = "ollama" if (ollama_reachable and model_available) else "deterministic"

        return {
            "ollama_reachable": ollama_reachable,
            "model_available": model_available,
            "vision_model_available": vision_available,
            "vision_model_enabled": settings.ENABLE_VISION_MODEL,
            "active_provider": active,
            "configured_model": settings.OLLAMA_MODEL,
            "configured_vision_model": settings.OLLAMA_MODEL if settings.ENABLE_VISION_MODEL else "disabled",
        }

    async def generate_quest(
        self,
        skill_category: SkillCategory,
        difficulty: QuestDifficulty,
        duration_minutes: int,
        user_interests: List[str],
    ) -> QuestModel:
        """
        Generate a quest with automatic fallback:
        Tries Moondream via Ollama -> DeterministicQuestProvider.
        """
        if await self.ollama.is_available():
            try:
                logger.info("Attempting quest generation via Ollama model %s...", self.ollama.model_name)
                return await self.ollama.generate_quest(
                    skill_category=skill_category,
                    difficulty=difficulty,
                    duration_minutes=duration_minutes,
                    user_interests=user_interests,
                )
            except Exception as e:
                logger.warning("Ollama quest generation failed (%s), falling back to deterministic provider.", str(e))

        return await self.deterministic.generate_quest(
            skill_category=skill_category,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            user_interests=user_interests,
        )

    async def generate_reflection(
        self,
        observation: str,
        personal_reflection: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> Dict[str, str]:
        """
        Generate a supportive reflection on what the user noticed.
        """
        if await self.ollama.is_available():
            try:
                text = await self.ollama.generate_reflection(
                    observation=observation,
                    personal_reflection=personal_reflection,
                    skill_category=skill_category,
                )
                return {"reflection_text": text, "source": "ollama"}
            except Exception as e:
                logger.warning("Ollama reflection failed (%s), using deterministic fallback.", str(e))

        text = await self.deterministic.generate_reflection(
            observation=observation,
            personal_reflection=personal_reflection,
            skill_category=skill_category,
        )
        return {"reflection_text": text, "source": "deterministic"}

    async def generate_follow_up(
        self,
        quest_title: str,
        observation: str,
    ) -> Dict[str, Any]:
        """
        Generate a follow-up challenge.
        """
        if await self.ollama.is_available():
            try:
                return await self.ollama.generate_follow_up(quest_title, observation)
            except Exception:
                pass

        return await self.deterministic.generate_follow_up(quest_title, observation)

    def recommend_skill_branch(self, user_interests: List[str]) -> SkillCategory:
        """Recommend a skill branch based on interest keywords."""
        interests_text = " ".join(user_interests).lower()
        if any(w in interests_text for w in ["tree", "plant", "nature", "bird", "forest", "leaf"]):
            return SkillCategory.NATURE_TRACKER
        elif any(w in interests_text for w in ["sound", "music", "audio", "listen", "silence", "echo"]):
            return SkillCategory.SOUND_HUNTER
        elif any(w in interests_text for w in ["city", "building", "urban", "history", "street", "architecture"]):
            return SkillCategory.URBAN_EXPLORER
        return SkillCategory.VISUAL_EXPLORER

    async def analyze_image(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> Dict[str, Any]:
        """
        Analyze user photo.
        If vision model is enabled via config and Ollama is available, invokes Moondream.
        Otherwise safely falls back to deterministic observational cues without crashing.
        """
        if settings.ENABLE_VISION_MODEL and await self.ollama.is_available():
            try:
                return await self.ollama.analyze_image(
                    image_base64=image_base64,
                    prompt=prompt,
                    skill_category=skill_category,
                )
            except Exception as e:
                logger.warning("Ollama Moondream analysis failed (%s), using deterministic fallback.", str(e))

        return await self.deterministic.analyze_image(
            image_base64=image_base64,
            prompt=prompt,
            skill_category=skill_category,
        )

    async def generate_quest_from_image(
        self,
        image_base64: str,
        skill_category: Optional[SkillCategory] = None,
        difficulty: Optional[QuestDifficulty] = None,
    ) -> Dict[str, Any]:
        """
        Generate an observation quest contextualized by an analyzed image.
        Uses Moondream if enabled & reachable, else deterministic vision quest fallback.
        """
        if settings.ENABLE_VISION_MODEL and await self.ollama.is_available():
            try:
                return await self.ollama.generate_quest_from_image(
                    image_base64=image_base64,
                    skill_category=skill_category,
                    difficulty=difficulty,
                )
            except Exception as e:
                logger.warning("Ollama vision quest generation failed (%s), using deterministic fallback.", str(e))

        return await self.deterministic.generate_quest_from_image(
            image_base64=image_base64,
            skill_category=skill_category,
            difficulty=difficulty,
        )


quest_agent = QuestAgent()
