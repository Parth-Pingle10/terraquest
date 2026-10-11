# TerraQuest — Real-World Exploration Platform

> **Mobile-first, local-AI-powered exploration platform.**  
> Built for the Hacktoberfest Open-Source AI Challenge: *"Touch Grass"*.

TerraQuest inspires people to disconnect from screen-addictive feeds, step outside, explore physical neighborhoods, develop real sensory observation skills, preserve memories in a personal atlas, illuminate unexplored fog-of-war on a living map, and share discoveries with friends.

---

## Project Structure

The project maintains strict backend and frontend separation:

```text
TerraQuest/
├── backend/
│   ├── app/                    # FastAPI modular application
│   │   ├── api/v1/             # Endpoints (auth, maps, quests, discoveries, skills, ai, sharing, sync)
│   │   ├── core/               # Configuration, security, exceptions, logging
│   │   ├── db/                 # PyMongo connection & collection indexes
│   │   ├── models/             # Domain models & enums
│   │   ├── repositories/       # MongoDB repository pattern
│   │   ├── schemas/            # Pydantic v2 validation contracts
│   │   ├── services/           # Business logic & access control
│   │   └── ai/                 # Ollama client + Deterministic fallback orchestrator
│   ├── tests/                  # 26 automated unit & integration tests
│   ├── scripts/                # Seeder scripts
│   ├── Dockerfile              # Backend container definition
│   ├── docker-compose.yml      # Multi-container Compose definition
│   ├── pyproject.toml          # Packaging metadata
│   ├── requirements.txt        # Pinned dependencies
│   ├── .env.example            # Backend environment template
│   └── README.md               # Backend documentation
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable design system (LeafletMap, Button, Card, Badge, Modal)
│   │   ├── context/            # AuthContext (session, guest mode, theme, AI status)
│   │   ├── lib/                # IndexedDB and LocalStorage wrappers
│   │   ├── pages/              # ExplorePage, MapPage, QuestsPage, SignatureQuestPage,
│   │   │                       # SkillsPage, MemoriesPage, SharedMapViewPage,
│   │   │                       # OnboardingPage, AuthPage, SettingsPage
│   │   ├── services/           # Typed API clients matching FastAPI schemas
│   │   ├── styles/             # Cartographic Tailwind styling & tokens
│   │   ├── types/              # TypeScript domain schemas
│   │   ├── App.tsx             # Master router
│   │   └── main.tsx            # Application entrypoint
│   ├── public/                 # Static assets
│   ├── package.json            # Node dependencies
│   ├── vite.config.ts          # Vite configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── .env.example            # Frontend environment template
│   └── README.md               # Frontend documentation
│
├── .agents/
│   └── skills/
│       └── terraquest-frontend/
│           └── SKILL.md        # TerraQuest frontend architecture skill
│
├── docker-compose.yml          # Root multi-container compose
├── .gitignore                  # Git ignore rules
└── README.md                   # Full-stack documentation
```

---

## Required Startup Workflow

### 1. Backend Startup

In your first terminal:

```powershell
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

*(On macOS/Linux: `source .venv/bin/activate`)*

Install dependencies and start FastAPI:

```powershell
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API and interactive documentation will be running at:
- **API Base**: `http://127.0.0.1:8000`
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **Health Check**: `http://127.0.0.1:8000/health`

### 2. Frontend Startup

In a separate terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Configure `frontend/.env` with the backend URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The frontend will start at:
- **Web App**: `http://localhost:5173`

---

## Key Features Implemented

1. **Strict Backend / Frontend Separation**: Fully isolated `backend/` and `frontend/` folders with independent dependency management, Docker configurations, and environment variables.
2. **Explore Home Dashboard**: Live overview of player level, total XP, recent memories, map preview, and the signature quest shortcut.
3. **Interactive Map & Fog of War**: Leaflet map powered by OpenStreetMap tiles, revealing explored territory cells, user location tracking, and manual coordinate check-in for exploration without GPS.
4. **Signature Quest ("One Thing You Almost Missed")**: Complete 7-screen mindful observation quest with camera photo capture, reflection prompts, AI reflection via local LLM or fallback, authoritative XP awarding, and celebration.
5. **Observation Quests & AI Side-Quests**: Full quest catalog with category/difficulty/duration filters, start/complete flows, and custom quest generation powered by local Ollama.
6. **Discovery Skill Tree**: 4 perceptual disciplines (*Visual Explorer*, *Nature Tracker*, *Sound Hunter*, *Urban Explorer*) with level progression bars, unlocked tiers, and connected node mastery.
7. **Memory Atlas**: Comprehensive field journal supporting gallery and list views, IndexedDB photo storage, geo-tagging, private/unlisted/public visibility, and JSON data export.
8. **Revocable Map Sharing with Friends**: Tokenized map links (`/shared/:shareToken`) allowing friends to view explored cells and approved discoveries without login or exposure of private reflections.
9. **Guest Mode & Offline Resilience**: Instant exploration as a guest with IndexedDB photo storage and local progression, plus seamless synchronization to cloud accounts upon registration.
10. **Settings & Privacy Management**: Local-first storage inspector, AI status monitor, JSON journal export, data deletion, and account controls.

---

## Verification & Testing

### Backend Automated Tests
All 26 unit and integration tests pass cleanly:

```powershell
cd backend
.venv\Scripts\python -m pytest -v
```

```text
============================= 26 passed in 13.64s =============================
```

### Frontend Production Build
Independent TypeScript compilation and Vite production bundling succeed:

```powershell
cd frontend
npm run build
```

```text
✓ 1952 modules transformed.
dist/index.html                   1.55 kB
dist/assets/index-BoM0sDik.css   47.64 kB
dist/assets/index-CysRrz0-.js   633.96 kB
✓ built in 18.38s
```
