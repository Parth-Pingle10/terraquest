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

    async def is_vision_model_installed(self) -> bool:
        """Verify if the configured Moondream vision model exists locally in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("models", []):
                        name = m.get("name", "").lower()
                        if "moondream" in name or name.startswith(settings.OLLAMA_VISION_MODEL.lower()):
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

    async def analyze_image(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> Dict[str, Any]:
        """
        Invokes Ollama with the lightweight Moondream vision model.
        Extracts directly observable surface textures, contours, and physical traits.
        """
        # Strip any data URI header prefix (e.g. data:image/jpeg;base64,...)
        clean_b64 = image_base64
        if "base64," in clean_b64:
            clean_b64 = clean_b64.split("base64,")[1]
        clean_b64 = clean_b64.strip()

        vision_prompt = prompt or (
            "Analyze this photo carefully for outdoor and field observation. "
            "Describe the visible physical textures, shapes, natural vs architectural elements, "
            "and subtle details a mindful walker might observe. Do not guess exact plant or animal species if uncertain."
        )

        payload = {
            "model": settings.OLLAMA_VISION_MODEL,
            "prompt": vision_prompt,
            "images": [clean_b64],
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.85,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_VISION_TIMEOUT_SECONDS) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code != 200:
                    raise AIUnavailableError(f"Ollama vision returned HTTP {response.status_code}")
                result = response.json()
                raw_description = result.get("response", "").strip()
                if not raw_description:
                    raise AIUnavailableError("Moondream model returned empty description")

                sentences = [s.strip() for s in raw_description.split(".") if len(s.strip()) > 8]
                observable_details = sentences[:4]

                cat = skill_category or SkillCategory.VISUAL_EXPLORER
                lower = raw_description.lower()
                if any(w in lower for w in ["bark", "leaf", "moss", "tree", "plant", "soil", "stone", "grass"]):
                    cat = SkillCategory.NATURE_TRACKER
                elif any(w in lower for w in ["brick", "concrete", "metal", "curb", "wall", "arch", "window", "sign"]):
                    cat = SkillCategory.URBAN_EXPLORER

                return {
                    "description": raw_description,
                    "observable_details": observable_details or [raw_description[:120]],
                    "perceived_category": cat,
                    "uncertainty_note": "Visual observation grounded in directly discernible textures and shapes.",
                    "source": "moondream",
                }
        except httpx.RequestError as e:
            logger.warning("Failed to reach Ollama for vision inference: %s", str(e))
            raise AIUnavailableError(f"Ollama vision connection error: {str(e)}")

    async def generate_quest_from_image(
        self,
        image_base64: str,
        skill_category: Optional[SkillCategory] = None,
        difficulty: Optional[QuestDifficulty] = None,
    ) -> Dict[str, Any]:
        """
        Analyze an image via Moondream and contextualize a guided observation quest.
        """
        analysis = await self.analyze_image(image_base64, skill_category=skill_category)
        diff = difficulty or QuestDifficulty.BEGINNER
        cat = skill_category or analysis["perceived_category"]

        primary_detail = analysis["observable_details"][0] if analysis["observable_details"] else "observed textures"

        quest = await self.generate_quest(
            skill_category=cat,
            difficulty=diff,
            duration_minutes=15,
            user_interests=[primary_detail],
        )

        return {
            "analysis": analysis,
            "quest": quest,
            "source": "moondream",
        }

