import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    payload = {
        "username": "new_explorer",
        "password": "ValidPassword123!",
        "display_name": "New Explorer",
        "interests": ["nature", "birds"],
        "preferred_quest_duration": 15,
        "preferred_difficulty": "beginner",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "user" in data
    assert "token" in data
    assert data["user"]["username"] == "new_explorer"
    assert "password_hash" not in data["user"]
    assert "password" not in data["user"]


@pytest.mark.asyncio
async def test_duplicate_username_rejected(client: AsyncClient, authenticated_user):
    user, _ = authenticated_user
    payload = {
        "username": user["username"],
        "password": "AnotherPassword123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "USERNAME_TAKEN"


@pytest.mark.asyncio
async def test_login_success_and_failure(client: AsyncClient, authenticated_user):
    user, _ = authenticated_user

    # Correct credentials
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": user["username"], "password": "SecretPassword123!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()["data"]["token"]

    # Invalid password
    bad_res = await client.post(
        "/api/v1/auth/login",
        json={"username": user["username"], "password": "WrongPassword!"},
    )
    assert bad_res.status_code == 401
    assert bad_res.json()["success"] is False


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient, authenticated_user):
    user, token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["id"] == user["id"]
    assert data["username"] == user["username"]


@pytest.mark.asyncio
async def test_unauthorized_without_token(client: AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json()["success"] is False
