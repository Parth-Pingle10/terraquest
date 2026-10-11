import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signature_quest_retrieval(client: AsyncClient):
    res = await client.get("/api/v1/quests/signature")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "Almost Missed" in data["title"]
    assert data["skill_category"] == "visual_explorer"
    assert len(data["reflection_questions"]) > 0


@pytest.mark.asyncio
async def test_quest_workflow_and_idempotent_xp(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    # Get signature quest
    sig_res = await client.get("/api/v1/quests/signature")
    quest_id = sig_res.json()["data"]["id"]

    # Start quest
    start_res = await client.post(f"/api/v1/quests/{quest_id}/start", headers=headers)
    assert start_res.status_code == 200
    assert start_res.json()["data"]["status"] == "started"

    # Complete quest first time
    comp_1 = await client.post(
        f"/api/v1/quests/{quest_id}/complete",
        json={
            "observation": "Noticed miniature moss growing inside the mortar joints of the stone stairs.",
            "reflection": "Slowing down made me realize how much life thrives in plain sight.",
            "create_discovery": False,
        },
        headers=headers,
    )
    assert comp_1.status_code == 200
    data_1 = comp_1.json()["data"]
    assert data_1["status"] == "completed"
    assert data_1["xp_awarded"] == 10  # Beginner quest awards 10 XP
    assert data_1["total_skill_xp"] == 10
    assert data_1["reward_claimed"] is True
    assert data_1["ai_reflection"] is not None

    # Complete quest SECOND TIME (Duplicate completion)
    comp_2 = await client.post(
        f"/api/v1/quests/{quest_id}/complete",
        json={
            "observation": "Trying to submit again.",
            "create_discovery": False,
        },
        headers=headers,
    )
    assert comp_2.status_code == 200
    data_2 = comp_2.json()["data"]
    # XP awarded on duplicate submission MUST be 0!
    assert data_2["xp_awarded"] == 0
    # Total XP must remain 10, not 20!
    assert data_2["total_skill_xp"] == 10


@pytest.mark.asyncio
async def test_quest_completion_status(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    sig_res = await client.get("/api/v1/quests/signature")
    quest_id = sig_res.json()["data"]["id"]

    # Before starting
    st_0 = await client.get(f"/api/v1/quests/{quest_id}/completion-status", headers=headers)
    assert st_0.status_code == 200
    assert st_0.json()["data"]["reward_claimed"] is False
