"""Database connection and index management."""

from app.db.mongo import get_db, mongo_manager
from app.db.indexes import create_indexes

__all__ = ["get_db", "mongo_manager", "create_indexes"]
