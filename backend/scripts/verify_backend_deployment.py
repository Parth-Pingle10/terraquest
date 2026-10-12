import asyncio
import sys
from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_backend():
    print("=== TERRAQUEST BACKEND DEPLOYMENT VALIDATION ===")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Root route
        res = await client.get("/")
        print(f"1. GET /: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("   Body:", res.json())

        # 2. Health route
        res = await client.get("/health")
        print(f"\n2. GET /health: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("   Body:", res.json())

        # 3. Ready route
        res = await client.get("/ready")
        print(f"\n3. GET /ready: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("   Body:", res.json())

        # 4. AI Status route
        res = await client.get("/api/v1/ai/status")
        print(f"\n4. GET /api/v1/ai/status: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("   Body:", res.json())

        # 5. AI Quest Generation (Testing Fallback without Ollama)
        res = await client.post(
            "/api/v1/ai/quests/generate",
            json={
                "skill_category": "nature_tracker",
                "difficulty": "intermediate",
                "duration_minutes": 20,
                "user_interests": ["botany", "trees"],
            },
        )
        print(f"\n5. POST /api/v1/ai/quests/generate: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json().get("data", {})
        print("   Quest Title:", data.get("title"))
        print("   Quest Category:", data.get("skill_category"))
        print("   Generation Source:", data.get("generation_source"))

        # 6. Quest Catalog Listing (Zero Mongo)
        res = await client.get("/api/v1/quests")
        print(f"\n6. GET /api/v1/quests: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        quests = res.json()
        print(f"   Catalog Count: {len(quests)} starter quests loaded in memory")

        # 7. Vision Analysis (Fallback when vision model disabled or offline)
        # Small transparent 1x1 gif base64
        sample_b64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        res = await client.post(
            "/api/v1/ai/vision/analyze",
            json={
                "image_base64": sample_b64,
                "prompt": "Identify any moss or stone texture in this photo.",
                "coordinates": {"lat": 37.7749, "lng": -122.4194},
            },
        )
        print(f"\n7. POST /api/v1/ai/vision/analyze: Status {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("   Vision Response:", res.json())

    print("\nALL BACKEND DEPLOYMENT VALIDATION CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_backend())
