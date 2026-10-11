import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_all_four_skill_branches_present(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/skills", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    branches = data["branches"]
    assert len(branches) == 4

    categories = {b["skill_category"] for b in branches}
    expected = {"visual_explorer", "nature_tracker", "sound_hunter", "urban_explorer"}
    assert categories == expected


@pytest.mark.asyncio
async def test_skill_level_calculation(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve visual explorer branch initially at level 1
    res = await client.get("/api/v1/skills/visual_explorer", headers=headers)
    assert res.status_code == 200
    branch = res.json()["data"]
    assert branch["level"] == 1
    assert branch["xp"] == 0
    assert branch["xp_for_next_level"] == 50
