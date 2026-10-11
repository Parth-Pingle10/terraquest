import random
from typing import Any, Dict, List, Optional
from app.ai.provider import AIProvider
from app.models.enums import QuestDifficulty, SkillCategory
from app.models.quest import QuestModel


CURATED_DETERMINISTIC_QUESTS: List[Dict[str, Any]] = [
    # Signature Quest
    {
        "title": "One Thing You Almost Missed",
        "description": "Slow down your pace and notice an ordinary detail that you would otherwise overlook.",
        "skill_category": SkillCategory.VISUAL_EXPLORER,
        "difficulty": QuestDifficulty.BEGINNER,
        "duration_minutes": 15,
        "instructions": "Walk along your usual route, but slow your pace by half. Look for something you would normally walk past—a pattern of moss on mortar, a carved marking on a curb, or sunlight hitting an unexpected surface. Spend 3-5 minutes observing it closely.",
        "reflection_questions": [
            "What did you notice that you normally walk past?",
            "Why did it catch your attention once you slowed down?",
            "What might you have missed if you hadn't taken this time?",
        ],
        "completion_criteria": "Find one overlooked detail and record an observation about its texture, color, or origin.",
        "optional_follow_up_prompt": "Tomorrow, look for another detail created by the passage of time or weather.",
        "keywords": ["mindfulness", "textures", "patterns", "detail", "quiet", "ordinary"],
    },
    # Visual Explorer Quests
    {
        "title": "Palette of the Pavement",
        "description": "Find five distinct natural and human-made colors hidden in your immediate surroundings.",
        "skill_category": SkillCategory.VISUAL_EXPLORER,
        "difficulty": QuestDifficulty.BEGINNER,
        "duration_minutes": 15,
        "instructions": "Pick a single block or trail segment. Search for 5 distinct shades (e.g., rust-orange, sage-green, slate-grey, ochre, cobalt). Observe where natural weathering creates colors you didn't expect.",
        "reflection_questions": [
            "Which color was the hardest to spot in your environment?",
            "Did the most vibrant color come from nature or human construction?",
        ],
        "completion_criteria": "Identify and mentally catalogue 5 distinct color hues on your path.",
        "optional_follow_up_prompt": "Try tracking how morning versus evening light shifts these tones.",
        "keywords": ["color", "art", "photography", "light", "visual"],
    },
    {
        "title": "Geometry of Shadows",
        "description": "Examine how angular sunlight casts repeating patterns across buildings and foliage.",
        "skill_category": SkillCategory.VISUAL_EXPLORER,
        "difficulty": QuestDifficulty.INTERMEDIATE,
        "duration_minutes": 25,
        "instructions": "Walk during mid-morning or late afternoon. Look for intersecting shadow lines cast by fences, branches, or window frames. Notice how static structures produce fluid moving shadow projections.",
        "reflection_questions": [
            "How do shadows transform mundane shapes into something dramatic?",
            "Did you notice light reflecting upward from unexpected surfaces?",
        ],
        "completion_criteria": "Document three distinct repeating shadow geometries in your environment.",
        "optional_follow_up_prompt": "Return to the same spot at another time to see how the angles shifted.",
        "keywords": ["light", "shadows", "geometry", "sun", "contrast"],
    },
    {
        "title": "Micro-Ecosystem in Miniature",
        "description": "Locate an isolated patch of life thriving in a harsh or unexpected urban spot.",
        "skill_category": SkillCategory.VISUAL_EXPLORER,
        "difficulty": QuestDifficulty.ADVANCED,
        "duration_minutes": 35,
        "instructions": "Search crevices in brickwork, storm drain grates, or cracks between asphalt slabs. Find a miniature community of moss, seedlings, or tiny insects surviving in less than a square foot of soil.",
        "reflection_questions": [
            "What resources are keeping this micro-habitat alive?",
            "What does this miniature resilience say about the surrounding ecosystem?",
        ],
        "completion_criteria": "Observe and describe a self-contained micro-habitat less than 30cm across.",
        "optional_follow_up_prompt": "Revisit this micro-habitat after rain to see how it responds.",
        "keywords": ["resilience", "micro", "moss", "crevices", "tiny"],
    },
    # Nature Tracker Quests
    {
        "title": "Canopy and Bark Atlas",
        "description": "Inspect the trunks and bark patterns of three different mature trees in your area.",
        "skill_category": SkillCategory.NATURE_TRACKER,
        "difficulty": QuestDifficulty.BEGINNER,
        "duration_minutes": 20,
        "instructions": "Find three trees of different species. Examine the texture of their bark: is it furrowed, peeling, smooth, or lichen-encrusted? Run your fingers gently over the surface.",
        "reflection_questions": [
            "How does each tree's bark protect it from environmental stressors?",
            "Did you spot any insects, lichen, or birds utilizing the trunk?",
        ],
        "completion_criteria": "Examine bark textures from 3 trees and note their differences.",
        "optional_follow_up_prompt": "Try identifying the tree species using their leaf shapes.",
        "keywords": ["trees", "plants", "bark", "nature", "botany", "green"],
    },
    {
        "title": "Wind and Water Traces",
        "description": "Track the invisible paths of rainwater drainage and wind currents across the ground.",
        "skill_category": SkillCategory.NATURE_TRACKER,
        "difficulty": QuestDifficulty.INTERMEDIATE,
        "duration_minutes": 25,
        "instructions": "Look at sediment trails, leaf drifts, and soil erosion along your path. Follow the slope of the land to determine where water flows when a heavy storm arrives.",
        "reflection_questions": [
            "Where does natural water get channeled in this area?",
            "How has plant growth or soil compaction adapted to water flow?",
        ],
        "completion_criteria": "Trace a continuous drainage or drift line for at least 30 meters.",
        "optional_follow_up_prompt": "Map where rainwater accumulates versus where it drains freely.",
        "keywords": ["water", "soil", "wind", "weather", "erosion", "landscape"],
    },
    {
        "title": "Wild Forager's Eye",
        "description": "Discover five wild pioneer plants flourishing without human cultivation.",
        "skill_category": SkillCategory.NATURE_TRACKER,
        "difficulty": QuestDifficulty.ADVANCED,
        "duration_minutes": 40,
        "instructions": "Look past landscaped lawns to unmanaged borders, fences, and vacant edges. Identify 5 wild herbs, grasses, or dandelions that seeded themselves naturally.",
        "reflection_questions": [
            "What adaptations allow these pioneer species to thrive without human care?",
            "Which pollinators or birds rely on these unmanaged plants?",
        ],
        "completion_criteria": "Catalog 5 self-seeded wild plants along fence lines or open edges.",
        "optional_follow_up_prompt": "Find out the historical or medicinal uses of one of the plants you found.",
        "keywords": ["wild", "herbs", "plants", "flowers", "foraging", "botany"],
    },
    # Sound Hunter Quests
    {
        "title": "The 60-Second Sound Bath",
        "description": "Close your eyes or fix your gaze, and listen to the distinct acoustic layers around you.",
        "skill_category": SkillCategory.SOUND_HUNTER,
        "difficulty": QuestDifficulty.BEGINNER,
        "duration_minutes": 10,
        "instructions": "Find a bench, step, or quiet corner. Stand still for 60 uninterrupted seconds. Count how many distinct sound sources you can isolate: distant engines, rustling leaves, bird calls, footsteps, wind against wires.",
        "reflection_questions": [
            "What was the furthest sound you were able to hear?",
            "What was the quietest sound you noticed only after focusing?",
        ],
        "completion_criteria": "Identify at least 4 distinct simultaneous sound layers.",
        "optional_follow_up_prompt": "Notice how the soundscape alters when you move behind a building wall.",
        "keywords": ["sound", "audio", "listen", "silence", "birds", "acoustics"],
    },
    {
        "title": "Rhythm of the Walk",
        "description": "Attune to the varied percussive sounds of different surfaces under your shoes.",
        "skill_category": SkillCategory.SOUND_HUNTER,
        "difficulty": QuestDifficulty.INTERMEDIATE,
        "duration_minutes": 20,
        "instructions": "Walk across gravel, timber bridges, paving stones, asphalt, and dry leaves. Notice the pitch and resonance change with each surface transition.",
        "reflection_questions": [
            "Which material produced the most resonant acoustic feedback?",
            "How does footstep sound influence your perception of safety and speed?",
        ],
        "completion_criteria": "Walk across 4 distinct footstep acoustics and compare their resonance.",
        "optional_follow_up_prompt": "Listen to the cadence of other pedestrians sharing your path.",
        "keywords": ["footsteps", "rhythm", "textures", "walking", "surfaces"],
    },
    {
        "title": "The Avian Dialect",
        "description": "Distinguish between alarm calls, territorial songs, and flock chatter among local birds.",
        "skill_category": SkillCategory.SOUND_HUNTER,
        "difficulty": QuestDifficulty.ADVANCED,
        "duration_minutes": 35,
        "instructions": "Find a pocket park or tree-lined street. Focus on bird vocalizations. Try to differentiate a persistent territorial song from a sudden sharp alarm chirp warning of a passing cat or hawk.",
        "reflection_questions": [
            "Did the bird vocalizations change as you approached?",
            "How many different bird species were actively communicating?",
        ],
        "completion_criteria": "Isolate two distinct types of bird calls (e.g., song vs alarm).",
        "optional_follow_up_prompt": "Track whether song patterns intensify during morning or dusk twilight.",
        "keywords": ["birds", "song", "wildlife", "calls", "nature"],
    },
    # Urban Explorer Quests
    {
        "title": "Layers of the Past",
        "description": "Search for ghost signs, vintage masonry stamps, or remnants of previous eras.",
        "skill_category": SkillCategory.URBAN_EXPLORER,
        "difficulty": QuestDifficulty.BEGINNER,
        "duration_minutes": 20,
        "instructions": "Inspect older brick walls, manhole covers, cornerstones, or building foundations. Look for faded painted advertisements (ghost signs), foundry dates on utility caps, or structural alterations from past decades.",
        "reflection_questions": [
            "What clues did you find regarding the original purpose of this space?",
            "How has modern utility work altered or preserved the older foundation?",
        ],
        "completion_criteria": "Locate an inscription, utility casting date, or architectural mark older than 20 years.",
        "optional_follow_up_prompt": "Look up the history of the oldest street name in your neighborhood.",
        "keywords": ["history", "vintage", "architecture", "bricks", "urban", "heritage"],
    },
    {
        "title": "Thresholds and Portals",
        "description": "Appreciate the craftsmanship and wear on entranceways, gates, and doorways.",
        "skill_category": SkillCategory.URBAN_EXPLORER,
        "difficulty": QuestDifficulty.INTERMEDIATE,
        "duration_minutes": 25,
        "instructions": "Observe the thresholds of buildings along an urban street. Note differences in door handles, worn stone steps, lintels, and decorative ironwork. Notice where countless footsteps have smoothed the stone.",
        "reflection_questions": [
            "Which entrance felt the most inviting, and what design choices created that feeling?",
            "Where was the wear from human hands or shoes most pronounced?",
        ],
        "completion_criteria": "Compare the architectural styling and wear on 4 different entryways.",
        "optional_follow_up_prompt": "Find a hidden courtyard or passageway between two structures.",
        "keywords": ["doors", "entrances", "design", "woodwork", "metal", "architecture"],
    },
    {
        "title": "Infrastructure Maze",
        "description": "Map the visible lifelines of the city: conduits, hydrants, vents, and utility markers.",
        "skill_category": SkillCategory.URBAN_EXPLORER,
        "difficulty": QuestDifficulty.ADVANCED,
        "duration_minutes": 35,
        "instructions": "Follow the visible network of water, power, and telecommunications along a commercial or residential strip. Look for color-coded survey markings, steam vents, cable risers, and fire department connections.",
        "reflection_questions": [
            "How much of the neighborhood's vital support system is hiding in plain sight?",
            "What color codes or inspection symbols did you decipher?",
        ],
        "completion_criteria": "Map out the relationship between 3 different public utility access points.",
        "optional_follow_up_prompt": "Follow the line of a stormwater drain to its discharge point or inlet.",
        "keywords": ["infrastructure", "utilities", "systems", "city", "mapping", "pipes"],
    },
]


class DeterministicQuestProvider(AIProvider):
    """
    Offline, deterministic rule-based quest and reflection generator.
    Requires no network, no Ollama, and no API keys.
    """

    def __init__(self) -> None:
        self.catalog = CURATED_DETERMINISTIC_QUESTS

    async def is_available(self) -> bool:
        return True

    async def generate_quest(
        self,
        skill_category: SkillCategory,
        difficulty: QuestDifficulty,
        duration_minutes: int,
        user_interests: List[str],
    ) -> QuestModel:
        """
        Select best matching quest template using category, difficulty, duration, and interests.
        """
        # Filter matching category and difficulty
        exact_matches = [
            q for q in self.catalog
            if q["skill_category"] == skill_category and q["difficulty"] == difficulty
        ]

        # Fallback to matching category if exact difficulty not found
        if not exact_matches:
            exact_matches = [q for q in self.catalog if q["skill_category"] == skill_category]

        # Global fallback
        if not exact_matches:
            exact_matches = self.catalog

        # Score by user interests keywords
        interests_lower = {i.lower() for i in user_interests}
        scored = []
        for q in exact_matches:
            score = 0
            keywords = q.get("keywords", [])
            for kw in keywords:
                if any(kw in interest or interest in kw for interest in interests_lower):
                    score += 2
            # Proximity in duration
            duration_diff = abs(q["duration_minutes"] - duration_minutes)
            score -= (duration_diff / 10.0)
            scored.append((score, q))

        # Pick top scored (with a bit of variation among ties)
        scored.sort(key=lambda x: x[0], reverse=True)
        chosen_template = scored[0][1] if scored else self.catalog[0]

        # Build clean QuestModel
        return QuestModel(
            title=chosen_template["title"],
            description=chosen_template["description"],
            skill_category=chosen_template["skill_category"],
            duration_minutes=duration_minutes or chosen_template["duration_minutes"],
            difficulty=difficulty or chosen_template["difficulty"],
            instructions=chosen_template["instructions"],
            reflection_questions=chosen_template["reflection_questions"],
            completion_criteria=chosen_template["completion_criteria"],
            optional_follow_up_prompt=chosen_template.get("optional_follow_up_prompt"),
            generation_source="deterministic",
            active=True,
        )

    async def generate_reflection(
        self,
        observation: str,
        personal_reflection: Optional[str] = None,
        skill_category: Optional[SkillCategory] = None,
    ) -> str:
        """
        Generate supportive, thoughtful reflection tailored to observation text and category.
        """
        obs_lower = observation.lower()
        cat_str = skill_category.value if skill_category else "explorer"

        if "tree" in obs_lower or "leaf" in obs_lower or "bark" in obs_lower or "moss" in obs_lower:
            return (
                f"Your attention to the living textures around you highlights how resilient nature is in our shared spaces. "
                f"Noticing the subtle growth in {observation[:50]}... reveals how life quietly claims every available corner. Keep tuning your eye to these quiet rhythms."
            )
        elif "sound" in obs_lower or "hear" in obs_lower or "listen" in obs_lower or "bird" in obs_lower:
            return (
                f"Tuning into the acoustic layers of the world takes true patience. "
                f"By isolating sounds like '{observation[:40]}...', you trained your ears to discover an entire invisible dimension that most people walk right past."
            )
        elif "brick" in obs_lower or "wall" in obs_lower or "door" in obs_lower or "street" in obs_lower:
            return (
                f"Every urban surface carries the imprint of human craftsmanship and the weathering of time. "
                f"Your observation of '{observation[:45]}...' honors the subtle stories embedded into our built environment."
            )
        else:
            return (
                f"Slowing down to observe '{observation[:50]}...' is exactly what real-world exploration is about. "
                f"By pausing to look closer, you turned an ordinary stroll into a memorable observation. Well done on touching grass today!"
            )

    async def generate_follow_up(
        self,
        quest_title: str,
        observation: str,
    ) -> Dict[str, Any]:
        return {
            "follow_up_prompt": (
                f"Now that you noticed '{observation[:40]}...', on your next walk look for how changing light or weather alters its appearance."
            ),
            "suggested_skill": SkillCategory.VISUAL_EXPLORER,
            "source": "deterministic",
        }
