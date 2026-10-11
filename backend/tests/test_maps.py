import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_map(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post(
        "/api/v1/maps",
        json={
            "title": "Downtown Discovery Map",
            "description": "Exploration of old town alleyways",
            "map_visibility": "private",
            "region_name": "Downtown Central",
            "region_grid_cells": 100,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    map_data = create_res.json()["data"]
    assert map_data["title"] == "Downtown Discovery Map"
    assert map_data["discovered_cells_count"] == 0
    assert map_data["exploration_percentage"] == 0.0

    map_id = map_data["id"]

    # Retrieve map
    get_res = await client.get(f"/api/v1/maps/{map_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == map_id


@pytest.mark.asyncio
async def test_map_ownership_protection(client: AsyncClient, authenticated_user, second_user):
    _, alice_token = authenticated_user
    _, bob_token = second_user

    # Alice creates a private map
    create_res = await client.post(
        "/api/v1/maps",
        json={"title": "Alice's Secret Map", "map_visibility": "private"},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    map_id = create_res.json()["data"]["id"]

    # Bob tries to access Alice's private map
    bob_get = await client.get(
        f"/api/v1/maps/{map_id}",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert bob_get.status_code == 403

    # Bob tries to update Alice's map
    bob_update = await client.patch(
        f"/api/v1/maps/{map_id}",
        json={"title": "Bob's Hacked Title"},
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert bob_update.status_code == 403

    # Bob tries to delete Alice's map
    bob_delete = await client.delete(
        f"/api/v1/maps/{map_id}",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert bob_delete.status_code == 403


@pytest.mark.asyncio
async def test_idempotent_cell_checkin(client: AsyncClient, authenticated_user):
    _, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post(
        "/api/v1/maps",
        json={"title": "Park Grid", "region_grid_cells": 10},
        headers=headers,
    )
    map_id = create_res.json()["data"]["id"]

    # First check-in to coordinate (37.7749, -122.4194)
    checkin_1 = await client.post(
        f"/api/v1/maps/{map_id}/check-ins",
        json={"latitude": 37.7749, "longitude": -122.4194},
        headers=headers,
    )
    assert checkin_1.status_code == 200
    data_1 = checkin_1.json()["data"]
    assert data_1["is_new_cell"] is True
    assert data_1["total_discovered_cells"] == 1
    assert data_1["exploration_percentage"] == 10.0  # 1 / 10 = 10%

    # Second check-in to EXACT SAME location (should NOT increase unique count)
    checkin_2 = await client.post(
        f"/api/v1/maps/{map_id}/check-ins",
        json={"latitude": 37.7749, "longitude": -122.4194},
        headers=headers,
    )
    assert checkin_2.status_code == 200
    data_2 = checkin_2.json()["data"]
    assert data_2["is_new_cell"] is False
    assert data_2["total_discovered_cells"] == 1
    assert data_2["exploration_percentage"] == 10.0


@pytest.mark.asyncio
async def test_invalid_coordinates_rejected(client: AsyncClient, authenticated_user):
    _, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post(
        "/api/v1/maps",
        json={"title": "Test Map"},
        headers=headers,
    )
    map_id = create_res.json()["data"]["id"]

    # Invalid latitude (-95.0)
    bad_lat = await client.post(
        f"/api/v1/maps/{map_id}/check-ins",
        json={"latitude": -95.0, "longitude": 10.0},
        headers=headers,
    )
    assert bad_lat.status_code in (400, 422)

    # Invalid longitude (200.0)
    bad_lon = await client.post(
        f"/api/v1/maps/{map_id}/check-ins",
        json={"latitude": 10.0, "longitude": 200.0},
        headers=headers,
    )
    assert bad_lon.status_code in (400, 422)
