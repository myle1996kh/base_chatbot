# Multi-stage Dockerfile for ITL Chatbot - Full Stack Application
# Builds both frontend (React) and backend (FastAPI) in a single image

# ============================================================================
# Stage 1: Frontend - Use pre-built image from FPT Cloud registry
# ============================================================================
FROM registry.fke.fptcloud.com/e4c3b7f7-c2f1-4578-9666-55262c3dd980/chatbot-frontend:0.0.1 as frontend-builder

# No build needed - image already contains built frontend in /app/frontend/dist
# Expect: /app/frontend/dist exists inside this image


# ============================================================================
# Stage 2: Backend - Use pre-built image from FPT Cloud registry
# ============================================================================
FROM registry.fke.fptcloud.com/e4c3b7f7-c2f1-4578-9666-55262c3dd980/chatbot-backend:0.0.1 AS backend-env

# Expect: /app/.venv exists inside this image

# No build needed - image already contains:
# - Python virtual environment at /app/.venv


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

# Copy Python virtual environment + backend code from builder

# --- Backend venv from ENV image ---
COPY --from=backend-env /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# --- Backend code from current repo (GitLab build context) ---
COPY backend/src /app/src
COPY backend/alembic.ini /app/alembic.ini
COPY backend/alembic /app/alembic

# Copy Gunicorn configuration
COPY backend/gunicorn.conf.py /app/gunicorn.conf.py

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
