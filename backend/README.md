# TerraQuest Backend

> **Mobile-first, local-AI-powered real-world exploration platform.**  
> Built for the Hacktoberfest Open-Source AI Challenge: *"Touch Grass"*.

TerraQuest inspires people to disconnect from repetitive digital feeds, step outside, explore physical neighborhoods, develop real sensory observation skills, preserve memories in a personal atlas, reveal unexplored cells on an exploration map, and share discoveries with friends—all with a privacy-by-design, offline-resilient architecture powered by local open-weight AI.

---

## Architecture Overview

TerraQuest employs a **modular monolithic architecture** designed for high reliability, clear domain separation, and privacy protection:

```
terraquest/
├── app/
│   ├── main.py                     # FastAPI application factory, CORS, exception handlers, lifespan
│   ├── core/
│   │   ├── config.py               # Pydantic Settings reading .env with typed validation
│   │   ├── security.py             # Bcrypt password hashing, JWT tokens, SHA-256 share hashing
│   │   ├── exceptions.py           # Typed domain exceptions & JSON error formatting
│   │   └── logging.py              # Redacted structured logging (no passwords/tokens in logs)
│   ├── db/
│   │   ├── mongo.py                # PyMongo AsyncMongoClient connection & lifecycle manager
│   │   └── indexes.py              # Indexes, unique constraints & compound indexes
│   ├── utils/
│   │   ├── pagination.py           # Standardized pagination envelopes & metadata
│   │   ├── geo.py                  # Coordinate validation, deterministic cell IDs, Haversine distance
│   │   └── tokens.py               # Cryptographic random tokens and verification
│   ├── models/                     # Internal domain models & enums
│   │   ├── enums.py                # SkillCategory, QuestDifficulty, MapVisibility, etc.
│   │   ├── user.py                 # UserModel
│   │   ├── exploration_map.py      # ExplorationMapModel
│   │   ├── exploration_cell.py     # ExplorationCellModel
│   │   ├── discovery.py            # DiscoveryModel
│   │   ├── quest.py                # QuestModel & QuestCompletionModel
│   │   ├── skill_progress.py       # SkillProgressModel & level formulas
│   │   └── share.py                # MapShareModel
│   ├── schemas/                    # Pydantic v2 validation contracts & response envelopes
│   │   ├── common.py               # Envelope responses & message payloads
│   │   ├── user.py                 # Registration, login, profile schemas
│   │   ├── map.py                  # Map CRUD, statistics, cell check-ins
│   │   ├── discovery.py            # Full owner response & sanitized public response
│   │   ├── quest.py                # Quest catalog, start, completion payloads
│   │   ├── skill.py                # Skill tree, progress, branch history
│   │   ├── sharing.py              # Share link creation, friend view schemas
│   │   ├── ai.py                   # Generation, reflection, recommendation schemas
│   │   └── sync.py                 # Local-first client sync schemas
│   ├── repositories/               # Data access layer for MongoDB collections
│   ├── services/                   # Business logic, progression formulas, and access control
│   ├── ai/                         # AI Side-Quest subsystem
│   │   ├── provider.py             # Abstract AIProvider interface
│   │   ├── ollama_provider.py      # Local Ollama HTTP API client with timeout & error handling
│   │   ├── deterministic_provider.py # Offline rule-based quest & reflection generator
│   │   ├── quest_agent.py          # Orchestrator with automatic fallback to deterministic
│   │   ├── prompts.py              # System prompts & JSON schemas
│   │   └── output_validation.py    # JSON extraction & constrained repair
│   └── api/
│       ├── router.py               # Master API v1 router mounting all sub-routers
│       ├── dependencies.py         # Injected DB, services, and JWT user authentication
│       └── v1/
│           ├── health.py           # Liveness (/health) and database readiness (/ready) probes
│           ├── users.py            # Authentication (/api/v1/auth)
│           ├── maps.py             # Maps & exploration cells (/api/v1/maps)
│           ├── discoveries.py      # Memory atlas & discoveries (/api/v1/discoveries)
│           ├── quests.py           # Quests, signature quest, completions (/api/v1/quests)
│           ├── skills.py           # 4 skill branches & level progression (/api/v1/skills)
│           ├── ai.py               # AI status, generation, reflections (/api/v1/ai)
│           ├── sharing.py          # Revocable share links & friend views (/api/v1/shared)
│           ├── exploration.py      # User summary, timeline & heatmaps (/api/v1/exploration)
│           └── sync.py             # Local-first offline synchronization (/api/v1/sync)
├── scripts/
│   └── seed_quests.py              # Starter quest catalog seeder
├── tests/                          # 26 automated unit & integration tests
├── Dockerfile                      # Production container image
├── docker-compose.yml              # Multi-container Compose with MongoDB & backend
├── pyproject.toml                  # Project packaging configuration
└── requirements.txt                # Pinned dependencies
```

---

## Key Design Principles

1. **Privacy-by-Design**: User observations and personal reflections are private by default. When maps are shared with friends via links, personal reflections and precise coordinates are **never exposed**; only sanitized observations and approximate locations (if explicitly permitted by the owner) are returned.
2. **Local-First & Offline Resilience**: The application is fully functional offline without an internet connection or Ollama instance. The `DeterministicQuestProvider` generates rich observational quests across all 4 skill branches.
3. **No Paid Remote AI APIs**: TerraQuest operates exclusively with local open-weight models (e.g. `qwen2.5:0.5b` or `qwen2.5:1.5b` via Ollama) and offline deterministic algorithms. It will **never** leak user observations to paid cloud AI APIs.
4. **Idempotent Progression**: XP rewards, level calculations, and exploration cell discoveries are strictly computed and verified on the server. Duplicate completion submissions or repeat cell check-ins never duplicate XP or inflate discovered-cell counts.
5. **Separation of Storage**: Browser Local Storage & IndexedDB remain on the client for private media and device preferences. MongoDB holds shared maps, sanitized discoveries, quest catalogs, and progression records.

---

## Technology Stack

- **Python**: 3.11+ (verified compatible with 3.11, 3.12, 3.13)
- **Framework**: FastAPI with standard lifespan and OpenAPI/Swagger documentation
- **Validation**: Pydantic v2 and Pydantic Settings
- **Persistence**: PyMongo Asynchronous API (`AsyncMongoClient`)
- **Local AI Inference**: Ollama (`qwen2.5:0.5b`) with automatic fallback to `DeterministicQuestProvider`
- **HTTP Client**: HTTPX (asynchronous)
- **Authentication**: JWT (`pyjwt`) with Bcrypt password hashing
- **Testing**: Pytest with `pytest-asyncio` and isolated in-memory Mongo mocks

---

## Getting Started

### 1. Prerequisites

- Python 3.11 or higher installed
- [Optional] [MongoDB](https://www.mongodb.com/) running locally on port 27017 or via Docker
- [Optional] [Ollama](https://ollama.com/) running locally for local LLM inference

### 2. Environment Setup

Clone or enter the project directory:

```bash
cd terraquest
```

Create a virtual environment and activate it:

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**On Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Create your `.env` configuration file from the provided example:

**On Windows:**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS:**
```bash
cp .env.example .env
```

---

## Configuration (`.env`)

Configure the following variables in `.env`:

| Variable | Default Value | Description |
|---|---|---|
| `APP_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `APP_DEBUG` | `true` | Enables verbose debug logging |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection URI |
| `MONGODB_DB_NAME` | `terraquest` | Database name |
| `JWT_SECRET_KEY` | *(Set strong secret)* | 32+ character key for JWT token signatures |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiration time (24 hours) |
| `SHARE_TOKEN_SALT` | *(Set random salt)* | Salt used when hashing share tokens with SHA-256 |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed frontend origins |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama local HTTP endpoint |
| `OLLAMA_MODEL` | `qwen2.5:0.5b` | Configured open-weight model |
| `DEFAULT_REGION_GRID_CELLS`| `100` | Cell count denominator for exploration percentage |

---

## Ollama Local AI Setup (Optional)

If you wish to use local LLM generation instead of the offline deterministic provider:

1. Download and start Ollama from [ollama.com](https://ollama.com).
2. Pull the recommended low-resource open-weight model:
   ```bash
   ollama pull qwen2.5:0.5b
   ```
   *(For systems with more VRAM, `qwen2.5:1.5b` can also be used by setting `OLLAMA_MODEL=qwen2.5:1.5b` in `.env`)*
3. Verify installed models:
   ```bash
   ollama list
   ```

*Note: If Ollama is offline or the model is not installed, the backend will automatically and seamlessly use the built-in `DeterministicQuestProvider`. The application never crashes or halts due to AI unavailability.*

---

## Starting the Application

### Option A: Running Directly on Host

1. Start MongoDB (if not running as a Windows service):
   ```bash
   mongod --dbpath <data_directory>
   ```

2. Seed the starter quest catalog:
   ```bash
   python scripts/seed_quests.py
   ```

3. Launch the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Open the interactive API documentation:
   - **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
   - **Liveness probe**: [http://localhost:8000/health](http://localhost:8000/health)
   - **Readiness probe**: [http://localhost:8000/ready](http://localhost:8000/ready)

### Option B: Running with Docker Compose

To run the backend and MongoDB in isolated Docker containers:

```bash
docker compose up --build -d
```

- Backend API: `http://localhost:8000`
- MongoDB: Bound to `127.0.0.1:27017`
- The backend automatically talks to MongoDB via the container network service name `mongodb`.
- To access an Ollama daemon running on your host machine from inside Docker, `OLLAMA_BASE_URL=http://host.docker.internal:11434` is pre-configured.

---

## Running the Automated Test Suite

Run the full automated test suite:

```bash
pytest -v
```

The test suite runs with an isolated in-memory MongoDB mock layer (`mongomock`), meaning tests run completely in isolation without requiring external network connections or risking development database data.

**Verified Tests (26 passed):**
- `tests/test_health.py`: Liveness probe and database readiness verification.
- `tests/test_auth.py`: Registration, password hashing, duplicate username rejection, login, and token enforcement.
- `tests/test_maps.py`: Map CRUD, multi-user ownership authorization, check-ins, coordinate bounds validation, and percentage formulas.
- `tests/test_discoveries.py`: Discovery CRUD, pagination, filtering, and privacy reflection isolation.
- `tests/test_quests.py`: Catalog listing, signature quest ("One Thing You Almost Missed"), starting, completing, and idempotent XP awarding.
- `tests/test_skills.py`: All 4 skill branches (`visual_explorer`, `nature_tracker`, `sound_hunter`, `urban_explorer`), deterministic level calculations, and history tracking.
- `tests/test_ai.py`: Offline deterministic generation, AI status reporting without leaking secrets, structured quest validation, and reflections.
- `tests/test_sharing.py`: Revocable token creation, token hashing (plaintext never stored), unauthenticated friend viewing, reflection sanitization, and revocation.
- `tests/test_exploration.py`: Aggregated summary statistics, timeline feeds, and heatmap density points.
- `tests/test_sync.py`: Local-first offline discovery and exploration synchronization contracts.

---

## API Endpoints Reference

All versioned REST endpoints are mounted under `/api/v1`.

### 1. Health & System
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Liveness probe returning app status | No |
| `GET` | `/ready` | Readiness probe checking database ping | No |

### 2. Authentication & User Profile
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user with username and password | No |
| `POST` | `/api/v1/auth/login` | Log in and receive Bearer JWT access token | No |
| `GET` | `/api/v1/auth/me` | Get profile of currently authenticated user | Yes |
| `PATCH` | `/api/v1/auth/me` | Update exploration interests & preferred duration | Yes |
| `POST` | `/api/v1/auth/logout` | Client token revocation acknowledgment | Yes |

### 3. Maps & Exploration Cells
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/maps` | Create a new exploration map | Yes |
| `GET` | `/api/v1/maps` | List maps owned by current user | Yes |
| `GET` | `/api/v1/maps/public` | List all publicly visible exploration maps | No |
| `GET` | `/api/v1/maps/{map_id}` | Get map details (restricted if private) | Optional |
| `PATCH` | `/api/v1/maps/{map_id}` | Update map title, description, or region grid | Yes (Owner) |
| `DELETE` | `/api/v1/maps/{map_id}` | Delete map | Yes (Owner) |
| `GET` | `/api/v1/maps/{map_id}/statistics` | Get map discovered-cell count & percentage | Optional |
| `GET` | `/api/v1/maps/{map_id}/cells` | List explored grid cells on the map | Optional |
| `POST` | `/api/v1/maps/{map_id}/check-ins` | Record an exploration cell check-in (Idempotent) | Yes (Owner) |

### 4. Memory Atlas & Discoveries
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/discoveries` | Record an observation & personal reflection | Yes |
| `GET` | `/api/v1/discoveries` | List user's discoveries (filterable & paginated) | Yes |
| `GET` | `/api/v1/discoveries/{discovery_id}` | View discovery details (restricted if private) | Optional |
| `PATCH` | `/api/v1/discoveries/{discovery_id}` | Update discovery observation or metadata | Yes (Owner) |
| `DELETE` | `/api/v1/discoveries/{discovery_id}` | Delete discovery | Yes (Owner) |
| `GET` | `/api/v1/maps/{map_id}/discoveries` | List discoveries on map (sanitized for non-owners) | Optional |

### 5. Quests & Progression
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/quests` | List curated quests in catalog | No |
| `GET` | `/api/v1/quests/signature` | Get "One Thing You Almost Missed" signature quest | No |
| `GET` | `/api/v1/quests/{quest_id}` | Get quest details | No |
| `POST` | `/api/v1/quests/{quest_id}/start` | Start quest workflow | Yes |
| `POST` | `/api/v1/quests/{quest_id}/complete` | Complete quest, award XP, create discovery | Yes |
| `GET` | `/api/v1/quests/{quest_id}/completion-status` | Check if user completed quest and claimed rewards | Yes |

### 6. Skill Tree & XP Progression
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/skills` | View overall progression across all 4 skill branches | Yes |
| `GET` | `/api/v1/skills/progress` | Alias for progression tree | Yes |
| `GET` | `/api/v1/skills/{skill_category}` | Get specific branch level, XP, and unlock criteria | Yes |
| `GET` | `/api/v1/skills/{skill_category}/history` | List completed quests in this skill category | Yes |

### 7. AI Side-Quest Agent
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/ai/status` | Check local Ollama connectivity and model status | No |
| `POST` | `/api/v1/ai/quests/generate` | Generate custom quest using local LLM or fallback | Optional |
| `POST` | `/api/v1/ai/quests/recommend` | Recommend skill branch & quest based on interests | Optional |
| `POST` | `/api/v1/ai/reflections` | Generate supportive reflection on user observation | No |
| `POST` | `/api/v1/ai/quests/follow-up` | Generate follow-up walking challenge | No |

### 8. Map Sharing with Friends
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/maps/{map_id}/shares` | Generate secure, revocable share link | Yes (Owner) |
| `GET` | `/api/v1/maps/{map_id}/shares` | List active share links for map | Yes (Owner) |
| `DELETE` | `/api/v1/maps/{map_id}/shares/{share_id}` | Revoke share link immediately | Yes (Owner) |
| `GET` | `/api/v1/shared/{share_token}` | Friend endpoint: View shared map without login | No |
| `GET` | `/api/v1/shared/{share_token}/discoveries` | Friend endpoint: View sanitized discoveries | No |

### 9. Exploration Statistics
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/exploration/summary` | Unique cells count, discoveries count, total XP | Yes |
| `GET` | `/api/v1/exploration/timeline` | Unified chronological activity feed | Yes |
| `GET` | `/api/v1/exploration/heatmap` | Exploration cell density points for fog-of-war | Yes |

### 10. Local-First Offline Synchronization
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/sync/discoveries` | Sync client-local discoveries with conflict check | Yes |
| `POST` | `/api/v1/sync/exploration` | Sync client-local cell visits with deduplication | Yes |

---

## Detailed Feature Workflows

### 1. The Signature Quest: "One Thing You Almost Missed"

This signature quest encourages noticing subtle beauty in ordinary everyday surroundings:
1. User retrieves instructions via `GET /api/v1/quests/signature`:
   > *"Walk along your usual route, but slow your pace by half. Look for something you would normally walk past—a pattern of moss on mortar, a carved marking on a curb, or sunlight hitting an unexpected surface. Spend 3-5 minutes observing it closely."*
2. User starts the quest via `POST /api/v1/quests/{quest_id}/start`.
3. User observes something real-world, records their observation text, and completes via `POST /api/v1/quests/{quest_id}/complete`.
4. The server:
   - Evaluates quest difficulty (`beginner` awards 10 XP).
   - Atomically credits 10 XP to the user's `visual_explorer` skill branch.
   - Recalculates level via `level = 1 + floor(xp / 50)`.
   - Generates a supportive, poetic AI reflection on what the user noticed.
   - Automatically saves an entry into the user's Memory Atlas if `create_discovery: true`.
   - Prevents duplicate XP: if the user sends the completion request again, the server acknowledges completion with `xp_awarded: 0`.

### 2. Map Sharing and Friend Viewing Workflow

How to share a map between User 1 (Alice) and User 2 (Friend):
1. **Alice logs in** via `POST /api/v1/auth/login` and receives an access token.
2. **Alice creates a private map** via `POST /api/v1/maps`.
3. **Alice records discoveries**, some with private reflections ("Secret memory") and photos.
4. **Alice requests a share link** via `POST /api/v1/maps/{map_id}/shares`:
   ```json
   {
     "include_discovery_titles": true,
     "include_discovery_descriptions": true,
     "include_approved_photos": false,
     "include_approximate_locations": true,
     "expires_in_hours": 168
   }
   ```
5. **Server generates a cryptographically secure token** (`secrets.token_urlsafe(32)`).
   - Only the SHA-256 hash of the token (`hashlib.sha256(salt + token)`) is stored in MongoDB.
   - The plaintext token is returned **only once** in the API response: `share_token: "wT5...9Q"`.
6. **Alice sends the link to Friend**: `/api/v1/shared/wT5...9Q`.
7. **Friend opens the link WITHOUT needing an account**:
   - `GET /api/v1/shared/wT5...9Q` returns the map title, description, and exploration percentage.
   - `GET /api/v1/shared/wT5...9Q/discoveries` returns sanitized observations.
   - **Privacy Guarantee**: `personal_reflection` is omitted, coordinates are rounded to 2 decimal places (~1.1 km approximate grid), unapproved photos are excluded, and private-visibility discoveries are filtered out.
8. **Alice can revoke the link at any time** via `DELETE /api/v1/maps/{map_id}/shares/{share_id}`. Revoked tokens immediately return `403 Forbidden` / `404 Not Found`.

---

## Local-First Storage vs Backend Synchronization

A future React/PWA or mobile frontend should be designed around local-first storage:
- **Browser Local Storage**: Small client preferences, UI dark/light mode toggle, guest user preferences.
- **IndexedDB**: High-resolution user photos, device-local journals, audio clips, offline quest drafts.
- **MongoDB Backend**: Shared maps, revocable share links, public discoveries, verified progression XP, and server-side quest catalogs.

**Synchronization Contract**:
- Guest users can complete quests and observe real-world details offline without creating an account.
- When an account is created, the frontend can selectively sync discoveries (`POST /api/v1/sync/discoveries`) using stable client UUIDs.
- The backend checks `client_updated_at` against server records to resolve conflicts without overwriting newer edits.
- Photos are stored locally in IndexedDB and **never uploaded automatically** unless the user explicitly enables photo sharing.

---

## Project Status & Limitations

- **Backend Complete**: All routes, services, repositories, AI providers, and automated tests are fully implemented and passing.
- **Frontend Scope**: In accordance with the prompt specification, no frontend (HTML/React/CSS) has been generated. The backend provides documented REST APIs ready for mobile or web client integration.
- **Physical GPS Verification**: As documented in `app/utils/geo.py`, client-reported GPS coordinates cannot be treated as cryptographic proof of physical presence. The platform is designed for intentional, self-motivated real-world exploration.
- **Vision Models**: The AI reflection endpoint focuses on text reflections. It does not claim visual photo inspection unless a vision model is specifically deployed.
