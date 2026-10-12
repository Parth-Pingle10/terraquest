import asyncio
from typing import AsyncGenerator, Dict, Tuple
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.memory_store import InMemoryDatabase, db_manager
from app.main import create_app


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def mock_db():
    fresh_db = InMemoryDatabase()
    db_manager._db = fresh_db
    yield fresh_db


@pytest_asyncio.fixture(scope="function")
async def client(mock_db) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(scope="function")
async def authenticated_user(client: AsyncClient) -> Tuple[Dict, str]:
    """Register and login a test user, returning (user_dict, access_token)."""
    reg_data = {
        "username": "explorer_alice",
        "password": "SecretPassword123!",
        "display_name": "Alice Explorer",
        "interests": ["trees", "birds", "architecture"],
        "preferred_quest_duration": 15,
        "preferred_difficulty": "beginner",
    }
    res = await client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code == 201
    data = res.json()["data"]
    user = data["user"]
    token = data["token"]["access_token"]
    return user, token


@pytest_asyncio.fixture(scope="function")
async def second_user(client: AsyncClient) -> Tuple[Dict, str]:
    """Register and login a second test user (Bob)."""
    reg_data = {
        "username": "explorer_bob",
        "password": "BobPassword456!",
        "display_name": "Bob Tracker",
        "interests": ["sound", "history"],
        "preferred_quest_duration": 20,
        "preferred_difficulty": "intermediate",
    }
    res = await client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code == 201
    data = res.json()["data"]
    user = data["user"]
    token = data["token"]["access_token"]
    return user, token
