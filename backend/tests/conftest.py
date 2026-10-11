import asyncio
from typing import AsyncGenerator, Dict, Tuple
import mongomock
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.mongo import mongo_manager
from app.main import create_app


class AsyncMockCursor:
    def __init__(self, sync_cursor):
        self._cursor = sync_cursor

    def sort(self, *args, **kwargs):
        self._cursor.sort(*args, **kwargs)
        return self

    def skip(self, n):
        self._cursor.skip(n)
        return self

    def limit(self, n):
        self._cursor.limit(n)
        return self

    def __aiter__(self):
        self._iter = iter(self._cursor)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class AsyncMockCollection:
    def __init__(self, sync_col):
        self._col = sync_col

    async def insert_one(self, doc):
        return self._col.insert_one(doc)

    async def insert_many(self, docs):
        return self._col.insert_many(docs)

    async def find_one(self, filter=None, *args, **kwargs):
        return self._col.find_one(filter, *args, **kwargs)

    def find(self, *args, **kwargs):
        return AsyncMockCursor(self._col.find(*args, **kwargs))

    async def find_one_and_update(self, filter, update, *args, **kwargs):
        return self._col.find_one_and_update(filter, update, *args, **kwargs)

    async def update_one(self, filter, update, *args, **kwargs):
        return self._col.update_one(filter, update, *args, **kwargs)

    async def delete_one(self, filter, *args, **kwargs):
        return self._col.delete_one(filter, *args, **kwargs)

    async def count_documents(self, filter=None, *args, **kwargs):
        return self._col.count_documents(filter or {})

    async def distinct(self, key, filter=None, *args, **kwargs):
        return self._col.distinct(key, filter or {})

    async def create_index(self, *args, **kwargs):
        return "mock_idx"


class AsyncMockDB:
    def __init__(self):
        self._client = mongomock.MongoClient()
        self._db = self._client["test_terraquest"]

    def __getattr__(self, name):
        return AsyncMockCollection(self._db[name])

    def __getitem__(self, name):
        return AsyncMockCollection(self._db[name])


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def mock_db():
    db = AsyncMockDB()
    mongo_manager.set_override_database(db)
    yield db
    mongo_manager.clear_override()


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
