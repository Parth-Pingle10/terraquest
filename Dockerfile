# ==============================================================================
# TerraQuest Backend Dockerfile (Root Context)
# Builds and runs only the FastAPI exploration service
# Zero Node.js / frontend dependencies. Zero external database dependencies.
# ==============================================================================

FROM python:3.11-slim AS runtime

WORKDIR /app

# Ensure Python unbuffered output and configure runtime defaults
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    APP_ENV=production \
    APP_DEBUG=false \
    OLLAMA_MODEL=moondream:v2 \
    OLLAMA_TIMEOUT_SECONDS=60 \
    ENABLE_VISION_MODEL=false

# Install minimal OS runtime packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements from backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/app ./app
COPY backend/pyproject.toml ./

# Create non-root application user
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Health check dynamically binds to Render's $PORT or default 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; port=os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

# Launch uvicorn listening on 0.0.0.0 on Render's assigned $PORT
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
