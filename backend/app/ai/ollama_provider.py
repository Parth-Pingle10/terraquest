from typing import Any, Dict, List, Optional
import httpx
from app.ai.output_validation import repair_and_validate_quest
from app.ai.prompts import (
    SYSTEM_QUEST_PROMPT,
    format_quest_generation_prompt,
    format_reflection_prompt,
)
from app.ai.provider import AIProvider
from app.core.config import settings
from app.core.exceptions import AIUnavailableError
from app.core.logging import logger
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.quest import QuestModel


class OllamaProvider(AIProvider):
    """
    Communicates with local Ollama instance via HTTP API.
    Runs entirely offline on local hardware with zero external cloud dependencies.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS

    async def is_available(self) -> bool:
        """Check if local Ollama daemon is reachable and whether configured model is present."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    # Check if model or tag matches
                    for m in models:
                        if self.model_name in m or m in self.model_name:
                            return True
                    # Daemon is up even if specific model name isn't pulled yet
                    return True
        except Exception:
            return False
        return False

    async def is_model_installed(self) -> bool:
        """Verify if the exact configured model exists locally in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("models", []):
                        name = m.get("name", "")
                        if self.model_name == name or name.startswith(f"{self.model_name}:"):
                            return True
        except Exception:
            return False
        return False

    async def generate_quest(
        self,
        skill_category: SkillCategory,
        difficulty: QuestDifficulty,
        duration_minutes: int,
        user_interests: List[str],
    ) -> QuestModel:
        prompt = format_quest_generation_prompt(
            skill_category=skill_category,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            user_interests=user_interests,
        )

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "system": SYSTEM_QUEST_PROMPT,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code != 200:
                    raise AIUnavailableError(f"Ollama returned HTTP {response.status_code}")
                
                result = response.json()
                raw_response = result.get("response", "")
        except httpx.RequestError as e:
            logger.warning("Failed to reach Ollama at %s: %s", self.base_url, str(e))
            raise AIUnavailableError(f"Ollama connection error: {str(e)}")

        quest = repair_and_validate_quest(
            raw_text=raw_response,
            default_category=skill_category,
            default_difficulty=difficulty,
            default_duration=duration_minutes,
        )
        if not quest:
            raise AIUnavailableError("Failed to validate structured JSON output from Ollama")

        return quest

    async def generate_reflection(
        self,
        observation: str,
        personal_reflection: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> str:
        prompt = format_reflection_prompt(
            observation=observation,
            personal_reflection=personal_reflection or "",
            skill_category=skill_category.value if skill_category else "explorer",
        )

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.6,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code == 200:
                    result = response.json()
                    text = result.get("response", "").strip()
                    if text:
                        return text
        except Exception as e:
            logger.warning("Ollama reflection generation error: %s", str(e))
            raise AIUnavailableError(f"Ollama reflection error: {str(e)}")

        raise AIUnavailableError("Empty reflection returned by model")

    async def generate_follow_up(
        self,
        quest_title: str,
        observation: str,
    ) -> Dict[str, Any]:
        prompt = f"""Based on the quest '{quest_title}' and observation '{observation}', suggest a 1-sentence follow-up challenge for the user's next walk."""
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    text = res.json().get("response", "").strip()
                    return {
                        "follow_up_prompt": text,
                        "suggested_skill": SkillCategory.VISUAL_EXPLORER,
                        "source": "ollama",
                    }
        except Exception as e:
            raise AIUnavailableError(str(e))
        raise AIUnavailableError("Ollama follow-up error")
