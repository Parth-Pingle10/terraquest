"""Index creation stub for in-memory persistence."""

from typing import Any
from app.core.logging import logger


async def create_indexes(db: Any) -> None:
    """In-memory store does not require database index creation."""
    logger.debug("In-memory database initialized.")
