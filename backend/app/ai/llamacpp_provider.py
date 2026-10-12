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


class LlamaCppProvider(AIProvider):
    """
    Communicates with a local llama.cpp server instance via its OpenAI-compatible HTTP API.
    Designed for small quantized GGUF models (such as Qwen 2.5 0.5B Instruct Q4_K_M).
    Runs offline with zero external cloud dependencies.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> None:
        self.base_url = (base_url or settings.LLAMA_CPP_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.LLAMA_CPP_TIMEOUT_SECONDS
        self.max_tokens = max_tokens or settings.LLAMA_CPP_MAX_TOKENS

    async def is_available(self) -> bool:
        """
        Check if the llama.cpp server is reachable and model is loaded.
        llama.cpp server exposes /health: returns {"status": "ok"} when ready.
        """
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/health")
                if res.status_code == 200:
                    data = res.json()
                    # llama-server returns status "ok" or "loading model"
                    return data.get("status") in ("ok", "ready") or "ok" in str(data).lower()
                # Fallback to /v1/models if /health returns 404 on some proxy setups
                models_res = await client.get(f"{self.base_url}/v1/models")
                return models_res.status_code == 200
        except Exception:
            return False

    async def _chat_completion(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        """Call the OpenAI-compatible /v1/chat/completions endpoint on llama.cpp server."""
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "top_p": 0.9,
            "max_tokens": self.max_tokens,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/v1/chat/completions", json=payload)
                if response.status_code != 200:
                    raise AIUnavailableError(f"llama.cpp server returned HTTP {response.status_code}")
                result = response.json()
                choices = result.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
                return ""
        except httpx.RequestError as e:
            logger.warning("Failed to reach llama.cpp at %s: %s", self.base_url, str(e))
            raise AIUnavailableError(f"llama.cpp connection error: {str(e)}")

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

        raw_response = await self._chat_completion(
            system_prompt=SYSTEM_QUEST_PROMPT,
            user_prompt=prompt,
            temperature=0.7,
        )

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
        prompt = format_reflection_prompt(
            observation=observation,
            personal_reflection=personal_reflection,
            skill_category=skill_category,
        )
        system_prompt = (
            "You are TerraQuest Reflection Guide. Provide an encouraging, mindful 2-3 sentence observation reflection. "
            "Never lecture or use clinical jargon. Ground your response in sensory curiosity."
        )

        response_text = await self._chat_completion(
            system_prompt=system_prompt,
            user_prompt=prompt,
            temperature=0.75,
        )
        return response_text.strip() or "Take a moment to absorb the quiet details around you."

    async def generate_follow_up(
        self,
        quest_title: str,
        observation: str,
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are TerraQuest Explorer Guide. Suggest a brief, curious follow-up observation micro-challenge. "
            "Return valid JSON with keys: title, instruction, observation_tip."
        )
        user_prompt = f"Original quest: {quest_title}\nUser observed: {observation}\nSuggest a follow-up challenge."

        response_text = await self._chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7,
        )

        import json
        import re

        try:
            match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return {
                    "title": str(data.get("title", f"Beyond {quest_title}")),
                    "instruction": str(data.get("instruction", "Look closer at one texture or contour you noted.")),
                    "observation_tip": str(data.get("observation_tip", "Pay attention to light and shadow.")),
                }
        except Exception:
            pass

        return {
            "title": f"Follow-up: {quest_title}",
            "instruction": "Look closer at one detail or pattern you passed by earlier.",
            "observation_tip": "Notice how the light and texture change from another perspective.",
        }

    async def analyze_image(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> Dict[str, Any]:
        """llama.cpp text server does not do vision; raise to trigger deterministic fallback."""
        raise AIUnavailableError("llama.cpp text instance does not support vision inference")

    async def generate_quest_from_image(
        self,
        image_base64: str,
        skill_category: Optional[SkillCategory] = None,
        difficulty: Optional[QuestDifficulty] = None,
    ) -> Dict[str, Any]:
        """llama.cpp text server does not do vision; raise to trigger deterministic fallback."""
        raise AIUnavailableError("llama.cpp text instance does not support vision inference")
