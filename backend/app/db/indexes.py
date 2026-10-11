"""Database index creation and maintenance for TerraQuest."""

from typing import Any
import pymongo
from app.core.logging import logger


async def create_indexes(db: Any) -> None:
    """Create all required indexes for collections."""
    try:
        # Users collection
        await db.users.create_index(
            [("username", pymongo.ASCENDING)],
            unique=True,
            name="uq_users_username",
        )

        # Exploration maps collection
        await db.exploration_maps.create_index(
            [("owner_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            name="idx_maps_owner_created",
        )
        await db.exploration_maps.create_index(
            [("map_visibility", pymongo.ASCENDING)],
            name="idx_maps_visibility",
        )

        # Exploration cells collection
        # Compound unique index prevents duplicate cell submissions within the same map
        await db.exploration_cells.create_index(
            [("map_id", pymongo.ASCENDING), ("cell_id", pymongo.ASCENDING)],
            unique=True,
            name="uq_cells_map_cell_id",
        )
        await db.exploration_cells.create_index(
            [("map_id", pymongo.ASCENDING), ("first_discovered_at", pymongo.DESCENDING)],
            name="idx_cells_map_discovered",
        )

        # Discoveries collection
        await db.discoveries.create_index(
            [("owner_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            name="idx_discoveries_owner_created",
        )
        await db.discoveries.create_index(
            [("map_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            name="idx_discoveries_map_created",
        )
        await db.discoveries.create_index(
            [("skill_category", pymongo.ASCENDING)],
            name="idx_discoveries_skill",
        )
        await db.discoveries.create_index(
            [("visibility", pymongo.ASCENDING)],
            name="idx_discoveries_visibility",
        )

        # Quests catalog collection
        await db.quests.create_index(
            [("skill_category", pymongo.ASCENDING), ("difficulty", pymongo.ASCENDING)],
            name="idx_quests_category_difficulty",
        )
        await db.quests.create_index(
            [("active", pymongo.ASCENDING)],
            name="idx_quests_active",
        )

        # Quest completions collection
        # For non-repeatable quests or unique completion records
        await db.quest_completions.create_index(
            [("user_id", pymongo.ASCENDING), ("quest_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)],
            name="idx_completions_user_quest_status",
        )

        # Skill progress collection
        # Unique constraint per user and skill category
        await db.skill_progress.create_index(
            [("user_id", pymongo.ASCENDING), ("skill_category", pymongo.ASCENDING)],
            unique=True,
            name="uq_skill_user_category",
        )

        # Map shares collection
        # Unique constraint on token hash
        await db.map_shares.create_index(
            [("token_hash", pymongo.ASCENDING)],
            unique=True,
            name="uq_shares_token_hash",
        )
        await db.map_shares.create_index(
            [("map_id", pymongo.ASCENDING), ("expires_at", pymongo.ASCENDING)],
            name="idx_shares_map_expires",
        )
        await db.map_shares.create_index(
            [("owner_id", pymongo.ASCENDING)],
            name="idx_shares_owner",
        )

        logger.info("Successfully created/verified MongoDB indexes.")
    except Exception as e:
        logger.warning("Index creation notice: %s", str(e))
