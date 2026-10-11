# TerraQuest Frontend

> **Mobile-first, cartographic field journal for real-world discovery.**  
> Built with React 19, TypeScript, Vite, Tailwind CSS, Leaflet, and IndexedDB.

TerraQuest inspires people to disconnect from screen-addictive feeds, step outside, explore physical neighborhoods, develop real sensory observation skills, preserve memories in a personal atlas, illuminate unexplored fog-of-war on a living map, and share discoveries with friends.

---

## Architecture & Technology Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS tailored with cartographic field journal tokens (`forest`, `moss`, `parchment`, `brass`, `charcoal`)
- **Maps & Cartography**: Leaflet with OpenStreetMap tiles and custom SVG coordinate markers
- **Icons**: Lucide React
- **Local Storage Architecture**:
  - **IndexedDB**: Camera photo blobs and local offline discovery records. Prevents quota exhaustion and guarantees photos never touch the network unless explicitly permitted.
  - **localStorage**: Guest profile moniker, theme (light/dark), and onboarding choices.
- **State & Context**: `AuthContext` managing session state, guest profile, local AI status checks, and theme switching.
- **API Client**: Central typed HTTP client (`src/services/api-client.ts`) with Bearer token authentication, network timeouts, and JSON unwrapping.

---

## Directory Structure

```text
frontend/
├── public/                 # Static assets & favicon
├── src/
│   ├── components/         # Reusable design system
│   │   ├── layout/         # Header, Navigation (Sidebar & Mobile bar), Layout
│   │   ├── map/            # LeafletMap component with Fog of War & markers
│   │   └── ui/             # Button, Card, Badge, Modal, LoadingState
│   ├── context/            # AuthContext (JWT session, guest mode, theme, AI status)
│   ├── lib/                # Storage & IDB helpers (idb.ts, storage.ts, utils.ts)
│   ├── pages/              # Primary application screens
│   │   ├── ExplorePage.tsx         # Dashboard with level, signature quest, map preview
│   │   ├── MapPage.tsx             # Full interactive map, manual check-in, share modal
│   │   ├── QuestsPage.tsx          # Quest catalog, filters, AI quest generator
│   │   ├── SignatureQuestPage.tsx  # Complete 7-screen "One Thing You Almost Missed" flow
│   │   ├── SkillsPage.tsx          # 4-branch Discovery Skill Tree & progression nodes
│   │   ├── MemoriesPage.tsx        # Memory Atlas gallery & list view with IDB photos
│   │   ├── SharedMapViewPage.tsx   # Public friend view with privacy-sanitized data
│   │   ├── OnboardingPage.tsx      # Multi-step onboarding with guest or sign-up options
│   │   ├── AuthPage.tsx            # Login and register forms connecting to FastAPI
│   │   └── SettingsPage.tsx        # Privacy, JSON export, storage clear, AI engine status
│   ├── services/           # Typed backend API client modules
│   │   ├── api-client.ts           # Central fetch wrapper
│   │   ├── auth-api.ts             # Auth & user profile
│   │   ├── maps-api.ts             # Maps & exploration cells
│   │   ├── discoveries-api.ts      # Discoveries & memory journal
│   │   ├── quests-api.ts           # Quests catalog, start, complete
│   │   ├── skills-api.ts           # Skill tree progression
│   │   ├── ai-api.ts               # Ollama AI status, quest generation, reflections
│   │   ├── sharing-api.ts          # Revocable map shares & friend access
│   │   ├── exploration-api.ts      # Statistics, timeline, heatmaps
│   │   └── sync-api.ts             # Offline-to-cloud batch synchronization
│   ├── styles/             # Tailwind base & custom cartographic styles
│   ├── types/              # Domain & API schemas matching FastAPI models
│   ├── App.tsx             # Master router
│   └── main.tsx            # React root mount
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your running FastAPI backend:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Run Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized, tree-shaken static production bundle in `dist/`.
