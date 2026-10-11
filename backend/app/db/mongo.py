"""MongoDB database client management using PyMongo AsyncMongoClient."""

from typing import Any, Optional
from pymongo import AsyncMongoClient
from app.core.config import settings
from app.core.logging import logger


class MongoManager:
    """Manages the asynchronous MongoDB connection lifecycle."""

    def __init__(self) -> None:
        self.client: Optional[AsyncMongoClient] = None
        self._db: Optional[Any] = None
        self._override_db: Optional[Any] = None

    async def connect(self, uri: Optional[str] = None, db_name: Optional[str] = None) -> None:
        """Initialize MongoDB client and verify connectivity."""
        if self._override_db is not None:
            logger.info("Using overridden test database.")
            return

        target_uri = uri or settings.MONGODB_URI
        target_db_name = db_name or settings.MONGODB_DB_NAME

        logger.info("Connecting to MongoDB at %s...", target_uri.split("@")[-1])
        self.client = AsyncMongoClient(
            target_uri,
            serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
        )
        self._db = self.client[target_db_name]

    async def disconnect(self) -> None:
        """Close MongoDB client connection."""
        if self.client is not None:
            logger.info("Closing MongoDB connection...")
            await self.client.close()
            self.client = None
            self._db = None

    async def ping(self) -> bool:
        """Check if MongoDB is responsive."""
        if self._override_db is not None:
            return True
        if self.client is None or self._db is None:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception as e:
            logger.warning("MongoDB ping failed: %s", str(e))
            return False

    def get_database(self) -> Any:
        """Get the active database instance."""
        if self._override_db is not None:
            return self._override_db
        if self._db is None:
            raise RuntimeError("Database client is not connected. Call connect() first.")
        return self._db

    def set_override_database(self, db: Any) -> None:
        """Set a test/mock database override."""
        self._override_db = db

    def clear_override(self) -> None:
        """Clear test database override."""
        self._override_db = None


mongo_manager = MongoManager()


def get_db() -> Any:
    """Dependency / accessor for database."""
    return mongo_manager.get_database()
