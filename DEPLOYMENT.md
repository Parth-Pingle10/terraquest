# TerraQuest Production Deployment Guide (Render & Docker)

This guide documents the final production Docker configuration, zero-database architecture, browser localStorage persistence, Moondream AI model integration, and local verification steps for TerraQuest.

---

## 1. Architecture Overview

```
+--------------------------------------------------------------------------+
|                       Render Web Service (PORT $PORT)                    |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |                 FastAPI Application (Uvicorn 0.0.0.0)              |  |
|  |                                                                    |  |
|  |   /               -> Serves Built React SPA (index.html)          |  |
|  |   /assets/*       -> Static assets (JS, CSS, SVGs, Leaflet)       |  |
|  |   /health         -> Orchestrator Liveness Probe                   |  |
|  |   /ready          -> Orchestrator Readiness Probe                  |  |
|  |   /api/v1/*       -> REST API Endpoints                            |  |
|  |   /{catch-all}    -> SPA Client-Side Routing Fallback              |  |
|  +--------------------------------------------------------------------+  |
|                                     |                                    |
+-------------------------------------|------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-----------------------------+                           +-----------------------------+
|   Client Browser Storage    |                           |  Ollama / Moondream Server  |
|   (localStorage + IDB)      |                           |  - Optional Local Inference |
|   - Explorer Profile        |                           |  - Deterministic Fallback   |
|   - Memories & Discoveries  |                           |                             |
|   - Quests & XP / Skills    |                           +-----------------------------+
|   - Explored Map Cells      |
+-----------------------------+
```

### Key Architectural Decisions:
1. **Zero Database Dependency**: MongoDB, MongoDB Atlas, and all external database servers have been completely removed.
   - The backend runs an ultra-fast, zero-dependency in-memory store for session caching and instant starter quest catalogs.
   - All user data persists reliably in the client browser's `localStorage` and `IndexedDB`.
2. **Single Unified Web Service**: Multi-stage Dockerfile builds the React frontend with Vite/Node 20 and bundles it into a lightweight Python 3.11 runtime. No CORS mismatches, zero proxy latency, and single-port simplicity on Render.
3. **Dynamic Port Binding**: Listens on `0.0.0.0` and binds dynamically to `${PORT:-8000}` supplied by Render.
4. **Single Model (Moondream:v2)**: Unified multimodal vision-language model (`moondream:v2`) handles both text quest generation and lightweight photo-based observation without running separate models.
5. **AI Reliability & Graceful Fallback**: Text generation and photo observations automatically prioritize `Ollama (moondream:v2)` -> `Deterministic Rule Engine`. When no model server is running, all quests, reflections, and field journal activities work reliably without throwing 500 errors.

---

## 2. Browser LocalStorage Persistence Matrix

All user-specific exploration data is persisted on the client device across page refreshes:

| Feature | Storage Mechanism | Key / Location | Refresh Persistence |
|---|---|---|---|
| **Explorer Identity & Preferences** | `localStorage` | `terraquest_guest_profile` | **Preserved** (display name, duration, difficulty, interests) |
| **Field Journal Memories** | `localStorage` + `IndexedDB` | `terraquest_guest_discoveries` | **Preserved** (observations, reflections, coordinates, photos) |
| **Active Quests** | `localStorage` | `terraquest_guest_active_quests` | **Preserved** (in-progress quest state) |
| **Completed Quests & History** | `localStorage` | `terraquest_guest_completed_quests`| **Preserved** (completion timestamps, notes) |
| **Custom & AI Quests** | `localStorage` | `terraquest_guest_custom_quests` | **Preserved** (persisted in catalog) |
| **XP & Level Progression** | `localStorage` | `terraquest_guest_xp` | **Preserved** (total XP, explorer rank) |
| **Skill Tree Nodes** | `localStorage` | `terraquest_guest_skills` | **Preserved** (branch levels, mastery status) |
| **Fog-of-War Explored Cells** | `localStorage` | `terraquest_guest_cells` | **Preserved** (GPS explored cells and radius) |
| **Theme & Onboarding** | `localStorage` | `terraquest_theme`, `terraquest_onboarded` | **Preserved** (light/dark mode, tutorial flag) |

> **Security & Sharing Note**: `localStorage` provides persistent client-side storage without cloud credentials or cross-device data leaks. Map links and public token sharing are hashed client-side. Multi-device sync is not supported without an external database, which is the intended design for local-first privacy.

---

## 3. Moondream AI Model Configuration & Budget

### Model Artifact Specifications:
- **Model Name**: `moondream:v2` (Official Ollama library)
- **Tag**: `moondream:v2` (digest: `55fc3abd3867`)
- **Download Size**: **829 MB** (~0.83 GB) — strictly under the 1 GB model budget.
- **Parameters**: 1.86B parameters.
- **Capabilities**: Multimodal vision-language model. Supports prompt-based text generation as well as base64-encoded image inspection.
- **Runtime RAM**: ~1.4 GB - 1.8 GB during inference.

### Resource Limits on Render:
- **Render Free Tier**: 512 MB RAM limit. Running Moondream in memory on a 512 MB instance will trigger an `OOM Kill (Exit Code 137)`.
- **Baseline Deployment**: `ENABLE_VISION_MODEL=false`.
  - When disabled, image-guided quests use TerraQuest's rich deterministic rule engine: it provides authentic observational cues grounded in physical textures and field patterns without fabricating artificial AI claims.
  - The entire application boots in under 2 seconds with an ultra-light ~80 MB RAM footprint.
- **Enabling Moondream Locally or on Paid Render Instances**:
  - Run Ollama with `ollama pull moondream:v2`.
  - Set `OLLAMA_BASE_URL=http://ollama:11434` (Docker) or `http://127.0.0.1:11434` (Host) and `ENABLE_VISION_MODEL=true`.

---

## 4. Production Environment Baseline

Use this configuration in `.env` or Render Dashboard:

```env
APP_ENV=production
APP_DEBUG=false
HOST=0.0.0.0
PORT=8000

JWT_SECRET_KEY=REPLACE_WITH_SECURE_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SHARE_TOKEN_SALT=REPLACE_WITH_DIFFERENT_RANDOM_SECRET

DEFAULT_REGION_GRID_CELLS=100

RATE_LIMIT_ENABLED=true
RATE_LIMIT_AUTH_PER_MINUTE=20
RATE_LIMIT_AI_PER_MINUTE=30
RATE_LIMIT_SHARE_PER_MINUTE=30

OLLAMA_MODEL=moondream:v2
OLLAMA_TIMEOUT_SECONDS=60
ENABLE_VISION_MODEL=false
```

*Note: `OLLAMA_BASE_URL` is omitted unless an Ollama container is explicitly configured on the network.*

---

## 5. Local Build & Validation Commands

### 1. Run Backend Test Suite
```bash
cd backend
python -m pytest -q
# Result: 28 passed in 12.36s (100% PASS, zero database dependencies)
```

### 2. Build Frontend Production Bundle
```bash
cd frontend
npm run build
# Result: Vite production build generated in dist/
```

### 3. Run Application via Docker Compose

**Standard Mode (App + In-Memory Store + LocalStorage):**
```bash
docker compose up --build
```

**AI Mode (App + Ollama Moondream Container):**
```bash
docker compose --profile ai up --build
```

### 4. Verify Endpoints
- **Web App**: http://localhost:8000
- **Liveness Probe**: http://localhost:8000/health (Returns HTTP 200 `{"status": "ok"}`)
- **Readiness Probe**: http://localhost:8000/ready (Returns HTTP 200 `{"status": "ready"}`)
- **AI Engine Status**: http://localhost:8000/api/v1/ai/status
- **Quest Catalog**: http://localhost:8000/api/v1/quests

---

## 6. Render Deployment Instructions (Backend-Only)

### Overview
This deployment runs strictly the FastAPI backend as a standalone service. No Node.js build, no frontend code, and no external database dependencies are involved.

---

### Step-by-Step Render Web Service Configuration

1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your GitHub repository:
   - **Repository**: `https://github.com/<your-username>/terraquest`
   - **Branch**: `main` (or your active feature branch)

3. Configure Service Settings:
   - **Name**: `terraquest-backend`
   - **Region**: Nearest to your users (e.g., Frankfurt / Oregon / Ohio / Singapore)
   - **Language / Runtime**: **`Docker`**
   - **Root Directory**: Leave blank (default `.`)
   - **Dockerfile Path**: `./backend/Dockerfile` *(or `./Dockerfile`)*
   - **Docker Context**: `.` *(or `./backend` if using `backend/Dockerfile` as root directory)*
   - **Instance Type**: **`Free`** (512 MB RAM, 0.1 CPU)
   - **Health Check Path**: `/health`

4. Add Environment Variables:
   | Key | Value | Description |
   |---|---|---|
   | `APP_ENV` | `production` | Production mode |
   | `APP_DEBUG` | `false` | Disables debug stack traces |
   | `HOST` | `0.0.0.0` | Container bind host |
   | `PORT` | *(Leave empty - Render assigns automatically)* | Render sets `$PORT` dynamically |
   | `CORS_ORIGINS` | `*` | Allows cross-origin requests from frontend (can restrict once frontend URL is known) |
   | `ENABLE_VISION_MODEL` | `false` | Keeps deterministic AI fallback active on Free tier (safeguards 512 MB RAM limit) |
   | `OLLAMA_MODEL` | `moondream:v2` | Model identifier |
   | `OLLAMA_TIMEOUT_SECONDS` | `60` | Request timeout for AI generation |
   | `JWT_SECRET_KEY` | *(Click "Generate" or provide 32+ char secret)* | Auth token signing |
   | `SHARE_TOKEN_SALT` | *(Click "Generate" or provide 32+ char secret)* | Hashing for public share tokens |

5. **Deploy**:
   Click **Create Web Service**.
   Render will pull the Docker image, run `pip install -r requirements.txt`, create `appuser`, and start Uvicorn.
   - Zero Node / TypeScript errors because frontend build is never executed.
   - Starts in ~15-30 seconds.
   - Memory usage: ~65 MB out of 512 MB.

---

### Model Deployment & Memory Footprint

- **Free Tier (512 MB RAM)**:
  - `moondream:v2` requires ~1.4 GB to 1.8 GB RAM during inference. Running Ollama with Moondream on the Free tier will immediately cause an `Out of Memory (OOM) Kill (Exit Code 137)`.
  - TerraQuest addresses this safely: `ENABLE_VISION_MODEL=false` runs the deterministic fallback engine, which provides structured observation prompts, authentic texture recognition hints, and instant quest generation with 0 MB model RAM overhead.

- **Enabling Moondream on Render (Paid / Private Service)**:
  If you wish to run live neural inference on Render:
  1. Create a second Web Service or Private Service running the official `ollama/ollama` Docker image with at least **2 GB to 4 GB RAM** (e.g., Render Starter/Standard tier).
  2. Attach a persistent disk (`/root/.ollama`) so the 829 MB `moondream:v2` model is not redownloaded on container restarts.
  3. Preload the model via container start command: `sh -c "ollama serve & sleep 5 && ollama pull moondream:v2 && wait"`.
  4. In the `terraquest-backend` service, add the private network URL:
     - `OLLAMA_BASE_URL`: `http://ollama-service-name:11434`
     - `ENABLE_VISION_MODEL`: `true`
  > **Note**: Do not use `http://localhost:11434` on Render to reach another container. Render private services communicate over their internal service domain name.

- **llama.cpp Note**:
  If compiling or using `llama.cpp` instead of Ollama, `moondream2` requires the specific `moondream2-text-model-f16.gguf` and `moondream2-mmproj-f16.gguf` projector files; you cannot pass an Ollama tag (`moondream:v2`) directly to llama.cpp binaries.

---

### Verification After Render Deployment
Once your Render backend URL is active (e.g., `https://terraquest-backend.onrender.com`):
1. Test Health: `curl https://terraquest-backend.onrender.com/health` -> `{"status":"ok"}`
2. Test Readiness: `curl https://terraquest-backend.onrender.com/ready` -> `{"status":"ready","database":"connected","persistence":"in_memory_and_client_localstorage"}`
3. Test OpenAPI Docs: Visit `https://terraquest-backend.onrender.com/docs` in your browser.
4. Test AI Status: `curl https://terraquest-backend.onrender.com/api/v1/ai/status` -> verifies provider status.

