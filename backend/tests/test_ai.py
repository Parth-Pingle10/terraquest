import pytest
from httpx import AsyncClient
from app.ai.deterministic_provider import DeterministicQuestProvider
from app.models.enums import QuestDifficulty, SkillCategory


@pytest.mark.asyncio
async def test_deterministic_provider_offline():
    provider = DeterministicQuestProvider()
    assert await provider.is_available() is True

    quest = await provider.generate_quest(
        skill_category=SkillCategory.NATURE_TRACKER,
        difficulty=QuestDifficulty.BEGINNER,
        duration_minutes=20,
        user_interests=["trees", "plants"],
    )
    assert quest.title is not None
    assert quest.skill_category == SkillCategory.NATURE_TRACKER
    assert len(quest.instructions) > 10
    assert len(quest.reflection_questions) >= 1

    reflection = await provider.generate_reflection(
        observation="Found three different tree barks along the sidewalk.",
        skill_category=SkillCategory.NATURE_TRACKER,
    )
    assert "bark" in reflection.lower() or "nature" in reflection.lower()


@pytest.mark.asyncio
async def test_ai_status_endpoint(client: AsyncClient):
    res = await client.get("/api/v1/ai/status")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "ollama_reachable" in data
    assert "model_available" in data
    assert "active_provider" in data
    assert "configured_model" in data
    # Ensure no secrets or full file paths are in response
    assert "JWT" not in str(data)
    assert "password" not in str(data)


@pytest.mark.asyncio
async def test_ai_quest_generation_endpoint(client: AsyncClient):
    res = await client.post(
        "/api/v1/ai/quests/generate",
        json={
            "skill_category": "sound_hunter",
            "difficulty": "beginner",
            "user_interests": ["audio", "quiet"],
            "duration_minutes": 15,
        },
    )
    assert res.status_code == 200
    quest = res.json()["data"]
    assert quest["skill_category"] == "sound_hunter"
    assert "title" in quest
    assert "instructions" in quest


@pytest.mark.asyncio
async def test_ai_reflection_endpoint(client: AsyncClient):
    res = await client.post(
        "/api/v1/ai/reflections",
        json={
            "observation": "I stopped to listen to distant church bells across the canal.",
            "skill_category": "sound_hunter",
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "reflection_text" in data
    assert data["source"] in ("ollama", "deterministic")
