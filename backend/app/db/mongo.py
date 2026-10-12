"""
Database client management for TerraQuest.
Uses in-memory persistence without any external MongoDB or network database dependency.
"""

from app.db.memory_store import DatabaseManager, InMemoryDatabase, db_manager, get_db

# Backwards compatible alias for existing imports
mongo_manager = db_manager
