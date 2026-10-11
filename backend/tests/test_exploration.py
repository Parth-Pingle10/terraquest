import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_exploration_summary_and_timeline(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    # Empty state summary
    res = await client.get("/api/v1/exploration/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_unique_discovered_cells"] == 0
    assert data["total_saved_discoveries"] == 0

    # Timeline endpoint works
    time_res = await client.get("/api/v1/exploration/timeline", headers=headers)
    assert time_res.status_code == 200
    assert isinstance(time_res.json()["data"], list)

    # Heatmap endpoint works
    heat_res = await client.get("/api/v1/exploration/heatmap", headers=headers)
    assert heat_res.status_code == 200
    assert isinstance(heat_res.json()["data"], list)
