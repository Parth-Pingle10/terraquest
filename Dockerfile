# ==============================================================================
# TerraQuest Multi-Stage Production Dockerfile
# Stage 1: Build the React / Vite frontend SPA
# Stage 2: Minimal Python 3.11 runtime serving FastAPI + SPA static bundle
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy dependency manifests first for optimal layer caching
COPY frontend/package.json frontend/package-lock.json* ./

RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy frontend source
COPY frontend/ ./

# Build static bundle to /build/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Runtime
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# Ensure Python output is unbuffered and prevents bytecode creation
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    APP_ENV=production \
    APP_DEBUG=false \
    OLLAMA_MODEL=moondream:v2 \
    OLLAMA_TIMEOUT_SECONDS=60 \
    ENABLE_VISION_MODEL=false

# Install minimal OS dependencies if needed and clean cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app
COPY backend/pyproject.toml ./

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Create non-root user for security best practices
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Health check verifies the HTTP endpoint using Render's PORT or default 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; port=os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

# Launch uvicorn listening on 0.0.0.0 using dynamic $PORT injected by Render
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
