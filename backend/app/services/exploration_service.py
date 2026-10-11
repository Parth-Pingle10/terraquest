from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.repositories.cell_repository import CellRepository
from app.repositories.completion_repository import CompletionRepository
from app.repositories.discovery_repository import DiscoveryRepository
from app.repositories.map_repository import MapRepository
from app.repositories.skill_repository import SkillRepository


class ExplorationService:
    def __init__(
        self,
        cell_repo: CellRepository,
        discovery_repo: DiscoveryRepository,
        completion_repo: CompletionRepository,
        skill_repo: SkillRepository,
        map_repo: MapRepository,
    ) -> None:
        self.cell_repo = cell_repo
        self.discovery_repo = discovery_repo
        self.completion_repo = completion_repo
        self.skill_repo = skill_repo
        self.map_repo = map_repo

    async def get_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Comprehensive summary of user's real exploration activity:
        Distinct cells, discoveries count, completed quests count, total XP, skill breakdown.
        """
        unique_cells = await self.cell_repo.count_distinct_cells_by_owner(user_id)
        total_discoveries = await self.discovery_repo.count_by_owner(user_id)
        completed_quests = await self.completion_repo.count_completed_by_user(user_id)
        branches = await self.skill_repo.get_all_branches(user_id)

        total_xp = sum(b.xp for b in branches)
        skill_breakdown = {b.skill_category.value: {"xp": b.xp, "level": b.level} for b in branches}

        return {
            "total_unique_discovered_cells": unique_cells,
            "total_saved_discoveries": total_discoveries,
            "total_completed_quests": completed_quests,
            "total_xp_earned": total_xp,
            "skill_breakdown": skill_breakdown,
        }

    async def get_timeline(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Recent exploration events: recent discoveries and completed quests merged chronologically.
        """
        discoveries, _ = await self.discovery_repo.list_filtered(
            owner_id=user_id, skip=0, limit=limit
        )
        completions, _ = await self.completion_repo.list_user_completions(
            user_id, skip=0, limit=limit
        )

        events: List[Dict[str, Any]] = []

        for d in discoveries:
            events.append({
                "type": "discovery",
                "id": d.id,
                "title": d.title,
                "skill_category": d.skill_category.value,
                "timestamp": d.created_at,
            })

        for c in completions:
            if c.completed_at:
                events.append({
                    "type": "quest_completion",
                    "id": c.id,
                    "quest_id": c.quest_id,
                    "xp_awarded": c.xp_awarded,
                    "timestamp": c.completed_at,
                })

        events.sort(key=lambda x: x["timestamp"], reverse=True)
        return events[:limit]

    async def get_heatmap(
        self, user_id: str, map_id: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Aggregated density data for visited cells to render exploration fog-of-war heatmaps.
        """
        if map_id:
            cells, _ = await self.cell_repo.list_cells(map_id, skip=0, limit=limit)
        else:
            maps, _ = await self.map_repo.list_by_owner(user_id, skip=0, limit=1)
            if not maps:
                return []
            cells, _ = await self.cell_repo.list_cells(maps[0].id, skip=0, limit=limit)

        heatmap_points = []
        for cell in cells:
            if cell.cell_center:
                heatmap_points.append({
                    "cell_id": cell.cell_id,
                    "latitude": cell.cell_center.get("latitude"),
                    "longitude": cell.cell_center.get("longitude"),
                    "visit_weight": min(10, cell.discovery_count),
                    "first_discovered_at": cell.first_discovered_at,
                    "last_visited_at": cell.last_visited_at,
                })

        return heatmap_points
