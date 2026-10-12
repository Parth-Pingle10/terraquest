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
    Communicates with local Ollama instance running the unified Moondream vision-language model.
    Moondream provides both text quest generation and lightweight photo-based observation.
    Runs entirely offline on local hardware with zero external cloud dependencies.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        raw_url = base_url if base_url is not None else settings.OLLAMA_BASE_URL
        self.base_url = raw_url.rstrip("/") if raw_url else None
        self.model_name = model_name or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS

    async def is_available(self) -> bool:
        """Check if local Ollama daemon is configured and reachable."""
        if not self.base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def is_model_installed(self) -> bool:
        """Verify if the configured Moondream model/tag exists in Ollama."""
        if not self.base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    installed_models = [m.get("name", "").lower() for m in data.get("models", [])]
                    target = self.model_name.lower()
                    for m in installed_models:
                        if target == m or m.startswith(f"{target}:") or target.startswith(f"{m}:"):
                            return True
                        # Allow tag matching (e.g. moondream:v2 matching moondream)
                        if "moondream" in target and "moondream" in m:
                            return True
        except Exception:
            return False
        return False

    async def is_vision_model_installed(self) -> bool:
        """Since Moondream is a multimodal vision-language model, check if Moondream is installed."""
        return await self.is_model_installed()

    async def generate_quest(
        self,
        skill_category: SkillCategory,
        difficulty: QuestDifficulty,
        duration_minutes: int,
        user_interests: List[str],
    ) -> QuestModel:
        if not self.base_url:
            raise AIUnavailableError("Ollama base URL is not configured")

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
        except httpx.TimeoutException:
            logger.warning("Ollama quest generation timed out after %s seconds", self.timeout)
            raise AIUnavailableError(f"Ollama request timed out after {self.timeout}s")
        except httpx.RequestError as e:
            logger.warning("Failed to reach Ollama at %s: %s", self.base_url, str(e))
            raise AIUnavailableError(f"Ollama connection error: {str(e)}")

        quest = repair_and_validate_quest(
            raw_text=raw_response,
            default_category=skill_category,
            default_difficulty=difficulty,
            default_duration=duration_minutes,
        )
        return quest

    async def generate_reflection(
        self,
        observation: str,
        personal_reflection: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> str:
        if not self.base_url:
            raise AIUnavailableError("Ollama base URL is not configured")

        prompt = format_reflection_prompt(
            observation=observation,
            personal_reflection=personal_reflection,
            skill_category=skill_category,
        )

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.75,
                "top_p": 0.9,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code != 200:
                    raise AIUnavailableError(f"Ollama returned HTTP {response.status_code}")
                result = response.json()
                return result.get("response", "").strip() or "Take a moment to absorb the quiet details around you."
        except Exception as e:
            logger.warning("Ollama reflection generation error: %s", str(e))
            raise AIUnavailableError(f"Reflection generation error: {str(e)}")

    async def generate_follow_up(
        self,
        quest_title: str,
        observation: str,
    ) -> Dict[str, Any]:
        if not self.base_url:
            raise AIUnavailableError("Ollama base URL is not configured")

        prompt = (
            f"An outdoor explorer completed the observation quest: '{quest_title}'.\n"
            f"Here is what they noticed: '{observation}'.\n\n"
            f"Suggest a brief, curious follow-up observation micro-challenge. "
            f"Output JSON with keys: title, instruction, observation_tip."
        )

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.7,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code != 200:
                    raise AIUnavailableError("Ollama follow-up call failed")
                import json
                result = response.json()
                parsed = json.loads(result.get("response", "{}"))
                return {
                    "title": str(parsed.get("title", f"Beyond {quest_title}")),
                    "instruction": str(parsed.get("instruction", "Look closer at one texture or contour you noted.")),
                    "observation_tip": str(parsed.get("observation_tip", "Pay attention to light and shadow.")),
                }
        except Exception as e:
            logger.warning("Ollama follow-up generation failed: %s", str(e))
            raise AIUnavailableError(str(e))

    async def analyze_image(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> Dict[str, Any]:
        """
        Invokes Ollama with the lightweight Moondream vision-language model.
        Extracts directly observable surface textures, contours, and physical traits.
        """
        if not self.base_url:
            raise AIUnavailableError("Ollama base URL is not configured")

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
            "model": self.model_name,
            "prompt": vision_prompt,
            "images": [clean_b64],
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.85,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code != 200:
                    raise AIUnavailableError(f"Ollama Moondream returned HTTP {response.status_code}")
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
        except httpx.TimeoutException:
            logger.warning("Moondream image analysis timed out after %s seconds", self.timeout)
            raise AIUnavailableError(f"Moondream vision timed out after {self.timeout}s")
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
        analysis = await self.analyze_image(
            image_base64=image_base64,
            prompt="Identify two visible physical details or materials an explorer could examine closely.",
            skill_category=skill_category,
        )

        category = skill_category or analysis["perceived_category"]
        diff = difficulty or QuestDifficulty.BEGINNER
        context = analysis.get("description", "Field photo observation")

        quest_prompt = (
            f"Create a mindful field quest based on this observed scene: '{context}'. "
            f"Encourage safe, respectful noticing. Output JSON with fields: "
            f"title, instructions, reflection_questions (list of 2), completion_criteria."
        )

        payload = {
            "model": self.model_name,
            "prompt": quest_prompt,
            "system": SYSTEM_QUEST_PROMPT,
            "stream": False,
            "options": {"temperature": 0.7},
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(f"{self.base_url}/api/generate", json=payload)
                if resp.status_code == 200:
                    raw = resp.json().get("response", "")
                    quest = repair_and_validate_quest(
                        raw_text=raw,
                        default_category=category,
                        default_difficulty=diff,
                        default_duration=15,
                    )
                    analysis["generated_quest"] = quest.model_dump()
        except Exception as e:
            logger.warning("Ollama quest generation from image failed: %s; using deterministic fallback", str(e))
            from app.ai.deterministic_provider import DeterministicQuestProvider
            det = DeterministicQuestProvider()
            det_res = await det.generate_quest_from_image(image_base64, category, diff)
            analysis["generated_quest"] = det_res["generated_quest"]

        return analysis
