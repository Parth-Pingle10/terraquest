"""Seed script to populate starter quests across all 4 skill branches and the signature quest."""

import asyncio
import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.deterministic_provider import CURATED_DETERMINISTIC_QUESTS
from app.core.logging import logger
from app.db.mongo import mongo_manager
from app.models.quest import QuestModel
from app.repositories.quest_repository import QuestRepository


async def seed_quests() -> None:
    logger.info("Initializing database connection for seeding...")
    await mongo_manager.connect()
    db = mongo_manager.get_database()
    quest_repo = QuestRepository(db)

    existing_count = await quest_repo.count()
    logger.info("Found %d existing quests in catalog.", existing_count)

    inserted = 0
    for template in CURATED_DETERMINISTIC_QUESTS:
        # Check if already exists by title
        existing = await db.quests.find_one({"title": template["title"]})
        if not existing:
            quest_model = QuestModel(
                title=template["title"],
                description=template["description"],
                skill_category=template["skill_category"],
                duration_minutes=template["duration_minutes"],
                difficulty=template["difficulty"],
                instructions=template["instructions"],
                reflection_questions=template["reflection_questions"],
                completion_criteria=template["completion_criteria"],
                optional_follow_up_prompt=template.get("optional_follow_up_prompt"),
                generation_source="seed",
                active=True,
            )
            await quest_repo.create(quest_model)
            inserted += 1
            logger.info("Seeded quest: '%s' [%s - %s]", quest_model.title, quest_model.skill_category.value, quest_model.difficulty.value)

    logger.info("Seeding complete. Inserted %d new quests.", inserted)
    await mongo_manager.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_quests())
