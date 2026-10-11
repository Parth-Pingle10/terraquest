import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_discoveries(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    # Create map first
    map_res = await client.post(
        "/api/v1/maps", json={"title": "Atlas Map"}, headers=headers
    )
    map_id = map_res.json()["data"]["id"]

    # Create discovery
    disc_res = await client.post(
        "/api/v1/discoveries",
        json={
            "map_id": map_id,
            "title": "Ancient Ivy Growth",
            "observation": "Observed English ivy climbing 15 meters up a brick chimney.",
            "personal_reflection": "Reminded me of childhood exploring behind grandpa's cottage.",
            "skill_category": "nature_tracker",
            "optional_latitude": 37.7749,
            "optional_longitude": -122.4194,
            "visibility": "private",
        },
        headers=headers,
    )
    assert disc_res.status_code == 201
    disc_data = disc_res.json()["data"]
    assert disc_data["title"] == "Ancient Ivy Growth"
    assert disc_data["personal_reflection"] == "Reminded me of childhood exploring behind grandpa's cottage."
    assert disc_data["optional_cell_id"] is not None

    disc_id = disc_data["id"]

    # List discoveries
    list_res = await client.get("/api/v1/discoveries", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["id"] == disc_id


@pytest.mark.asyncio
async def test_private_reflection_isolated_from_other_users(
    client: AsyncClient, authenticated_user, second_user
):
    _, alice_token = authenticated_user
    _, bob_token = second_user

    # Alice creates a map and private discovery
    map_res = await client.post(
        "/api/v1/maps",
        json={"title": "Alice Public Map", "map_visibility": "public"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    map_id = map_res.json()["data"]["id"]

    disc_res = await client.post(
        "/api/v1/discoveries",
        json={
            "map_id": map_id,
            "title": "Hidden Carving",
            "observation": "Initials carved in 1942.",
            "personal_reflection": "My deeply secret memory.",
            "visibility": "private",
        },
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    disc_id = disc_res.json()["data"]["id"]

    # Bob tries to view Alice's private discovery directly
    bob_view = await client.get(
        f"/api/v1/discoveries/{disc_id}",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert bob_view.status_code == 403
