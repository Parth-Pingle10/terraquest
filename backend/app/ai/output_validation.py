import json
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ValidationError
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.quest import QuestModel


class RawQuestOutput(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=1000)
    skill_category: SkillCategory
    duration_minutes: int = Field(ge=5, le=180)
    difficulty: QuestDifficulty
    instructions: str = Field(min_length=10, max_length=2000)
    reflection_questions: List[str] = Field(min_length=1)
    completion_criteria: str = Field(min_length=5, max_length=1000)
    optional_follow_up_prompt: Optional[str] = None


def extract_json_block(text: str) -> Optional[str]:
    """Extract raw JSON substring from potentially markdown-wrapped model output."""
    # Look for ```json ... ``` or ``` ... ```
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block:
        return code_block.group(1).strip()
    # Or look for { ... }
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        return brace_match.group(0).strip()
    return None


def repair_and_validate_quest(
    raw_text: str,
    default_category: SkillCategory,
    default_difficulty: QuestDifficulty,
    default_duration: int,
) -> Optional[QuestModel]:
    """
    Attempt to parse, validate, and optionally repair LLM quest output.
    Returns validated QuestModel or None if unrecoverable.
    """
    candidate_json = extract_json_block(raw_text) or raw_text.strip()
    
    try:
        data = json.loads(candidate_json)
    except json.JSONDecodeError:
        # Constrained repair: try fixing trailing commas or single quotes
        cleaned = re.sub(r",\s*([\]}])", r"\1", candidate_json)
        cleaned = cleaned.replace("'", '"')
        try:
            data = json.loads(cleaned)
        except Exception:
            return None

    if not isinstance(data, dict):
        return None

    # Harmonize enum fallbacks if LLM produced close variants
    if "skill_category" not in data or data["skill_category"] not in [s.value for s in SkillCategory]:
        data["skill_category"] = default_category.value
    if "difficulty" not in data or data["difficulty"] not in [d.value for d in QuestDifficulty]:
        data["difficulty"] = default_difficulty.value
    if "duration_minutes" not in data or not isinstance(data["duration_minutes"], int):
        data["duration_minutes"] = default_duration
    if "reflection_questions" not in data or not isinstance(data["reflection_questions"], list) or not data["reflection_questions"]:
        data["reflection_questions"] = [
            "What did you notice that surprised you?",
            "How did paying attention change your perspective on this space?",
        ]

    try:
        parsed = RawQuestOutput(**data)
        return QuestModel(
            title=parsed.title,
            description=parsed.description,
            skill_category=parsed.skill_category,
            duration_minutes=parsed.duration_minutes,
            difficulty=parsed.difficulty,
            instructions=parsed.instructions,
            reflection_questions=parsed.reflection_questions,
            completion_criteria=parsed.completion_criteria,
            optional_follow_up_prompt=parsed.optional_follow_up_prompt,
            generation_source="ai",
            active=True,
        )
    except ValidationError:
        return None
