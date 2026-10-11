from datetime import datetime, timezone
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_offline_sync_discoveries_and_exploration(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    # Create a map for user
    map_res = await client.post(
        "/api/v1/maps", json={"title": "Sync Map"}, headers=headers
    )
    map_id = map_res.json()["data"]["id"]

    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Sync offline discoveries
    sync_disc_res = await client.post(
        "/api/v1/sync/discoveries",
        json={
            "discoveries": [
                {
                    "client_id": "c1111111-1111-1111-1111-111111111111",
                    "map_id": map_id,
                    "title": "Offline Discovery 1",
                    "observation": "Found interesting lichen pattern offline.",
                    "personal_reflection": "Felt connected with nature.",
                    "skill_category": "nature_tracker",
                    "client_updated_at": now_iso,
                }
            ]
        },
        headers=headers,
    )
    assert sync_disc_res.status_code == 200
    disc_data = sync_disc_res.json()["data"]
    assert disc_data["synced_count"] == 1

    # 2. Sync exploration cells
    sync_cells_res = await client.post(
        "/api/v1/sync/exploration",
        json={
            "cells": [
                {
                    "map_id": map_id,
                    "latitude": 37.7749,
                    "longitude": -122.4194,
                    "visited_at": now_iso,
                }
            ]
        },
        headers=headers,
    )
    assert sync_cells_res.status_code == 200
    cells_data = sync_cells_res.json()["data"]
    assert cells_data["synced_cells_count"] == 1
    assert cells_data["new_cells_count"] == 1
