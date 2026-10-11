import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_map_share_flow(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Owner creates a private map
    map_res = await client.post(
        "/api/v1/maps",
        json={"title": "Shared Secret Exploration", "map_visibility": "private"},
        headers=headers,
    )
    map_id = map_res.json()["data"]["id"]

    # 2. Owner adds a discovery with a private reflection and photo
    await client.post(
        "/api/v1/discoveries",
        json={
            "map_id": map_id,
            "title": "Hidden Alley Arch",
            "observation": "Stone archway hidden behind ivy.",
            "personal_reflection": "Secret thoughts that must NEVER be shared.",
            "optional_latitude": 37.77492,
            "optional_longitude": -122.41941,
            "visibility": "shared",
        },
        headers=headers,
    )

    # 3. Owner generates a share link
    share_res = await client.post(
        f"/api/v1/maps/{map_id}/shares",
        json={
            "include_discovery_titles": True,
            "include_discovery_descriptions": True,
            "include_approved_photos": False,
            "include_approximate_locations": True,
            "expires_in_hours": 24,
        },
        headers=headers,
    )
    assert share_res.status_code == 201
    share_data = share_res.json()["data"]
    share_token = share_data["share_token"]
    share_id = share_data["share_id"]
    assert share_token is not None

    # 4. Friend accesses shared map WITHOUT authentication
    friend_map_res = await client.get(f"/api/v1/shared/{share_token}")
    assert friend_map_res.status_code == 200
    friend_map = friend_map_res.json()["data"]
    assert friend_map["title"] == "Shared Secret Exploration"

    # 5. Friend accesses shared discoveries WITHOUT authentication
    friend_disc_res = await client.get(f"/api/v1/shared/{share_token}/discoveries")
    assert friend_disc_res.status_code == 200
    disc_items = friend_disc_res.json()["data"]["items"]
    assert len(disc_items) == 1
    sanitized_disc = disc_items[0]
    assert sanitized_disc["title"] == "Hidden Alley Arch"
    assert sanitized_disc["observation"] == "Stone archway hidden behind ivy."
    # CRITICAL: Private reflection must NEVER be present!
    assert "personal_reflection" not in sanitized_disc
    # Coordinates must be rounded/approximate, not raw precise float
    assert sanitized_disc["approximate_latitude"] == 37.77
    assert sanitized_disc["approximate_longitude"] == -122.42

    # 6. Owner revokes the share link
    revoke_res = await client.delete(
        f"/api/v1/maps/{map_id}/shares/{share_id}",
        headers=headers,
    )
    assert revoke_res.status_code == 200

    # 7. Friend tries accessing revoked share link -> FORBIDDEN / NOT FOUND
    post_revoke_res = await client.get(f"/api/v1/shared/{share_token}")
    assert post_revoke_res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_invalid_share_token_rejected(client: AsyncClient):
    res = await client.get("/api/v1/shared/invalid-random-token-xyz")
    assert res.status_code == 404
