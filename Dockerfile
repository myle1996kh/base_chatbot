# Multi-stage Dockerfile for ITL Chatbot - Full Stack Application
# Builds both frontend (React) and backend (FastAPI) in a single image

# ============================================================================
# Stage 1: Frontend Builder - Build React frontend with Vite
# ============================================================================
FROM node:20-alpine as frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy package files first (for better Docker cache utilization)
COPY frontend/package*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tailwind.config.ts ./

# Install frontend dependencies (using npm ci for reproducible builds)
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build frontend (creates optimized static files in dist/)
RUN npm run build


# ============================================================================
# Stage 2: Backend Builder - Install Python dependencies with UV
# ============================================================================
FROM python:3.11-slim as backend-builder

# Set working directory
WORKDIR /app

# Copy .env vào container 
# Install UV (copy binaries from official uv image)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Avoid hardlink warnings when using cache mounts
ENV UV_LINK_MODE=copy

# (Optional but safer) build deps for packages that need compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install only third-party dependencies first (faster rebuilds)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

# Copy backend application code
COPY backend/src ./src
COPY backend/alembic.ini ./alembic.ini
COPY backend/alembic ./alembic/

# Now install the project itself into the environment
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev


# ============================================================================
# Stage 3: Runtime - Combine frontend and backend
# ============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_NO_UPDATE_CHECK=1

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy .env vào container 
COPY backend/.env /app/.env

# Copy Python virtual environment + backend code from builder
COPY --from=backend-builder /app/.venv /app/.venv
COPY --from=backend-builder /app/src /app/src
COPY --from=backend-builder /app/alembic.ini /app/alembic.ini
COPY --from=backend-builder /app/alembic /app/alembic

# Copy Gunicorn configuration
COPY backend/gunicorn.conf.py /app/gunicorn.conf.py

# Ensure we use the venv Python/uvicorn
ENV PATH="/app/.venv/bin:$PATH"

# Copy built frontend from frontend builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create uploads directory for file storage
RUN mkdir -p ./uploads && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port 8000
EXPOSE 8000

# Health check - Docker will ping this endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)" || exit 1

# Run the application with Gunicorn (multi-worker, production-ready)
# Uses gunicorn.conf.py for configuration (auto-scaling workers, graceful reload, etc.)
CMD ["gunicorn", "src.main:app", "-c", "/app/gunicorn.conf.py"]
