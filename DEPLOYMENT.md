# TerraQuest Production Deployment Guide (Render & Docker)

This guide documents the final production Docker configuration, Render deployment procedure, llama.cpp GGUF model integration, and local verification steps for TerraQuest.

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
|  |   /health         -> Orchestrator Liveness / Readiness Probe       |  |
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
|   MongoDB Atlas (External)  |                           |  llama.cpp / Ollama / Engine|
|   (MONGODB_URI env var)     |                           |  - Private local GGUF       |
|                             |                           |  - Deterministic Fallback   |
+-----------------------------+                           +-----------------------------+
```

### Key Deployment Characteristics:
- **Single Unified Container**: A multi-stage Dockerfile builds the React frontend with Vite/Node 20 and bundles it into the lightweight Python 3.11 FastAPI image. No CORS mismatches, zero extra proxy costs, and single-port simplicity on Render.
- **Port Dynamic Binding**: Listens on `0.0.0.0` and binds dynamically to `${PORT:-8000}` supplied by Render.
- **External MongoDB**: MongoDB is never baked into the container. Uses `MONGODB_URI` environment variable pointing to external MongoDB Atlas or cloud MongoDB instance.
- **Graceful Startup & Shutdown**: Database connection retries and index creation run in FastAPI lifespan; if MongoDB is momentarily unreachable, startup does not crash.
- **AI Reliability**: Text generation automatically prioritizes `llama.cpp` -> `Ollama` -> `Deterministic Rule Engine`. When no model server is running, all quests, reflections, and field journal activities work reliably without throwing 500 errors.

---

## 2. Resource Limits & Model Budget Analysis

### Model Budget Comparison

| Component | Artifact Name | Download Size | Runtime RAM | Render Free Tier (512 MB) | Paid Starter (2 GB) |
|---|---|---|---|---|---|
| **Text Model** | `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf` | **~398 MB** | ~600 MB - 750 MB (2048 ctx) | Exceeds RAM if combined with app | **Runs smoothly** |
| **Vision Model** | `Moondream 2` (Ollama/GGUF) | **~1.7 GB - 2.2 GB** | ~2.5 GB - 3.5 GB | Exceeds storage & RAM (OOM kill) | Exceeds 1 GB budget & RAM |
| **Docker Base Image** | `python:3.11-slim` + frontend bundle | **~240 MB** | ~80 MB - 120 MB | **Supported** | **Supported** |
| **Deterministic Engine** | Built-in Python rule engine | **0 MB** | < 10 MB | **Supported** | **Supported** |

### Critical Strategy & Submission Decisions:
1. **Model Download Budget**: The user limit is under 1 GB combined. Qwen 2.5 0.5B GGUF is **397.8 MB**, well within the 1 GB budget.
2. **Moondream Vision Model**: Moondream alone requires ~1.7 GB to download and > 2.5 GB of RAM to execute. Attempting to run Moondream in an ephemeral or free Render instance will immediately trigger an `OOM Kill (Exit Code 137)`.
3. **Production Configuration**: `ENABLE_VISION_MODEL=false` by default. When disabled, image-guided quests use TerraQuest's rich deterministic rule engine:
   - Does not make heavy cloud calls.
   - Grounded in authentic outdoor observation cues (textures, light, patterns).
   - Never fabricates fake AI responses.
   - Keeps 100% of the UI, quests, and memories functional.

---

## 3. Model Storage: Build-Time vs. Startup vs. Persistent Mount

| Approach | How it works | Storage Implication on Render | Recommendation |
|---|---|---|---|
| **Image Build-Time (`COPY` / `RUN curl`)** | Baking weights into the Docker image | Increases image build time by 5-15 mins; blows past registry size limits; redownloads every commit. | **NEVER bake model weights into Docker images.** |
| **Startup Download (`curl` on boot)** | Downloads weights every time container starts | On Render Free tier (ephemeral disk), redownloads 400MB+ on every cold start; causes 30s-90s boot delay, risking health check timeout. | Acceptable only on persistent disk instances. |
| **Persistent Volume / Mount** | Mounts a persistent volume (e.g. `/models`) or uses external host directory | Local Docker Compose mounts `./models:/models:ro`. Render Paid Web Service attaches a Render Persistent Disk (`/models`). | **Best Practice for AI workloads.** |

> **Render Free Tier Workaround**: Render Free instances provide ephemeral storage and 512 MB RAM. For submission purposes, deploy the unified application with `ENABLE_VISION_MODEL=false` and AI fallback enabled. The entire field atlas, GPS fog-of-war, questing system, skill tree, and guest mode run reliably with lightning speed (~80 MB RAM footprint).

---

## 4. Local Build & Validation Commands

### Step 1: Run Backend Tests
```bash
cd backend
python -m pytest -q
# Result: 28 passed
```

### Step 2: Build and Test Frontend
```bash
cd frontend
npm run build
# Result: Vite production bundle generated in dist/
```

### Step 3: (Optional) Download Qwen 2.5 0.5B GGUF Model (~398 MB)
```bash
python backend/scripts/download_model.py ./models
```

### Step 4: Run via Docker Compose

**Standard Mode (App + MongoDB + Deterministic Fallback):**
```bash
docker compose up --build
```

**Full AI Mode (App + MongoDB + llama.cpp Server Container):**
```bash
docker compose --profile ai up --build
```

### Step 5: Verify Endpoints
- **Web App**: http://localhost:8000
- **Liveness Probe**: http://localhost:8000/health (Returns HTTP 200 `{"status": "healthy"}`)
- **API Status**: http://localhost:8000/api/v1/health
- **AI Engine Status**: http://localhost:8000/api/v1/ai/status

---

## 5. Render Deployment Steps

### Option A: Deploy via Render Blueprint (`render.yaml`)

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml`.
4. Fill in the required `MONGODB_URI` environment variable when prompted.
5. Click **Apply**. Render will automatically build the multi-stage Dockerfile and deploy your service.

---

### Option B: Deploy Manually as a Web Service

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following parameters:
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Instance Type**: `Free` (or `Starter` if running persistent workloads)
   - **Health Check Path**: `/health`

4. Add the following **Environment Variables**:

| Variable Name | Recommended Value | Description |
|---|---|---|
| `PORT` | *(Render provides this automatically)* | Port assigned by Render (e.g. 10000) |
| `APP_ENV` | `production` | Enables production security settings |
| `APP_DEBUG` | `false` | Disables debug logs and stack trace leakages |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority` | Connection URI for external MongoDB Atlas |
| `MONGODB_DB_NAME` | `terraquest` | Database name |
| `JWT_SECRET_KEY` | *(Generate a 32+ character random string)* | Secret for auth tokens |
| `SHARE_TOKEN_SALT` | *(Generate a 32+ character random string)* | Salt for shared map hashes |
| `ENABLE_VISION_MODEL` | `false` | Protects against memory exhaustion on Render |
| `CORS_ORIGINS` | `*` (or your Render service URL) | Allowed origins |

5. Click **Create Web Service**.
6. When deployment finishes, navigate to your Render URL:
   - Your frontend loads instantly from `/`
   - The API is available at `/api/v1/`
   - Probes respond with `200 OK` at `/health`

---

## 6. Known Limitations & Architectural Notes

1. **Free Tier Ephemeral Filesystem**: Render Free Web Services restart on inactivity and spin down after 15 minutes of idle time. Any files written directly to the container disk are wiped upon restart. All user accounts, field discoveries, and fog-of-war states are safely persisted in MongoDB Atlas.
2. **Local Vision Inference**: Running multimodal image models (Moondream, LLaVA) requires GPU acceleration or at least 4 GB of RAM. In container environments without GPU, `ENABLE_VISION_MODEL=false` prevents memory leaks and ensures 100% uptime through deterministic exploration cues.
3. **Internal vs External Ports**: When running `compose.yaml` with the `--profile ai` flag, the `llama` service port (`8080`) is bound strictly to `127.0.0.1:8080` and internal Docker networking, ensuring the inference engine is never exposed to unauthenticated public traffic.
