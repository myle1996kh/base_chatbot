# Tài Liệu Pipeline & CI/CD
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025

---

## Mục Lục
1. [Tổng Quan Deployment](#1-tổng-quan-deployment)
2. [Docker Architecture](#2-docker-architecture)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Environment Configuration](#4-environment-configuration)
5. [Deployment Strategies](#5-deployment-strategies)
6. [Monitoring & Logging](#6-monitoring--logging)

---

## 1. Tổng Quan Deployment

### 1.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │           NGINX (Load Balancer)                │         │
│  │  - SSL Termination                             │         │
│  │  - Static file serving                         │         │
│  │  - Reverse proxy                               │         │
│  └────────────┬───────────────────────────────────┘         │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │       FastAPI Application (Gunicorn)           │         │
│  │  ┌──────────────┐  ┌──────────────┐           │         │
│  │  │  Worker 1    │  │  Worker 2    │  ...      │         │
│  │  │  (Uvicorn)   │  │  (Uvicorn)   │           │         │
│  │  └──────────────┘  └──────────────┘           │         │
│  │                                                 │         │
│  │  - 4-8 workers (CPU cores * 2)                │         │
│  │  - Auto-reload disabled                        │         │
│  │  - Production settings                         │         │
│  └────────────┬───────────────────────────────────┘         │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │          Infrastructure Layer                  │         │
│  │  ┌──────────────┐  ┌──────────────┐           │         │
│  │  │ PostgreSQL   │  │    Redis     │           │         │
│  │  │  + pgvector  │  │   (Cache)    │           │         │
│  │  └──────────────┘  └──────────────┘           │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                        ▲
                        │
                 Deploy via
                        │
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                            │
│  GitHub Actions / GitLab CI / Jenkins                        │
│  ├─ Build Docker image                                       │
│  ├─ Run tests                                                │
│  ├─ Push to registry                                         │
│  └─ Deploy to server                                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Môi Trường Triển Khai

| Môi trường | Mục đích | URL Example | Auto-deploy |
|-----------|----------|-------------|-------------|
| **Development** | Local development | localhost:8000 | ❌ Manual |
| **Staging** | Testing before production | staging.chatbot.com | ✅ On merge to `develop` |
| **Production** | Live system | chatbot.com | ✅ On tag `v*.*.*` |

---

## 2. Docker Architecture

### 2.1 Multi-Stage Dockerfile

```dockerfile
# ============================================
# STAGE 1: Frontend Builder
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./
COPY frontend/yarn.lock* ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY frontend/ ./

# Build frontend
RUN npm run build
# Output: /app/frontend/dist


# ============================================
# STAGE 2: Backend Builder
# ============================================
FROM python:3.11-slim AS backend-builder

WORKDIR /app/backend

# Install uv (fast Python package manager)
RUN pip install uv

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock* ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Output: /app/backend/.venv with all packages


# ============================================
# STAGE 3: Runtime
# ============================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Python virtual environment from builder
COPY --from=backend-builder /app/backend/.venv /app/.venv

# Copy backend source code
COPY backend/ /app/backend/

# Copy frontend build from builder
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Set environment
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application with Gunicorn
CMD ["gunicorn", "src.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
```

**Giải thích:**
- **Stage 1**: Build frontend React app → tạo static files
- **Stage 2**: Install Python dependencies → tạo virtual environment
- **Stage 3**: Copy kết quả từ 2 stages trước, tạo image runtime nhẹ

**Kích thước image:**
- Before multi-stage: ~2.5GB
- After multi-stage: ~800MB

---

### 2.2 Docker Compose - Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: chatbot_postgres
    environment:
      POSTGRES_DB: chatbot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - chatbot_network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: chatbot_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - chatbot_network

  # Backend + Frontend Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: chatbot_app
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - backend/.env
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres}@postgres:5432/chatbot
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=development
      - LOG_LEVEL=DEBUG
    volumes:
      # Mount source code for development hot-reload
      - ./backend:/app/backend
      - ./frontend:/app/frontend
      # Persist uploads
      - uploads_data:/app/uploads
    networks:
      - chatbot_network
    restart: unless-stopped

  # Nginx (Optional for local testing)
  nginx:
    image: nginx:alpine
    container_name: chatbot_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - chatbot_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  uploads_data:
    driver: local

networks:
  chatbot_network:
    driver: bridge
```

**Sử dụng:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build app
```

---

### 2.3 Docker Compose - Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: chatbot
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - /data/postgres:/var/lib/postgresql/data
    networks:
      - chatbot_network
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  redis:
    image: redis:7-alpine
    volumes:
      - /data/redis:/data
    networks:
      - chatbot_network
    restart: always
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru

  app:
    image: registry.example.com/chatbot:${VERSION}
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/chatbot
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=production
      - LOG_LEVEL=INFO
    env_file:
      - .env.production
    networks:
      - chatbot_network
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks:
      - chatbot_network
    restart: always

networks:
  chatbot_network:
    driver: overlay

volumes:
  postgres_data:
  redis_data:
```

---

## 3. CI/CD Pipeline

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ==========================================
  # JOB 1: Run Tests
  # ==========================================
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_chatbot
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install uv
          uv sync

      - name: Run database migrations
        run: |
          cd backend
          alembic upgrade head
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_chatbot

      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  # ==========================================
  # JOB 2: Build Docker Image
  # ==========================================
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ==========================================
  # JOB 3: Deploy to Staging
  # ==========================================
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.chatbot.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Deploy to staging server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/chatbot
            docker-compose pull app
            docker-compose up -d app
            docker-compose exec -T app alembic upgrade head

      - name: Health check
        run: |
          sleep 10
          curl -f https://staging.chatbot.com/health || exit 1

  # ==========================================
  # JOB 4: Deploy to Production
  # ==========================================
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://chatbot.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/chatbot
            docker-compose -f docker-compose.prod.yml pull app
            docker-compose -f docker-compose.prod.yml up -d app
            docker-compose -f docker-compose.prod.yml exec -T app alembic upgrade head

      - name: Health check
        run: |
          sleep 15
          curl -f https://chatbot.com/health || exit 1

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

### 3.2 GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG

# ==========================================
# TEST STAGE
# ==========================================
test:
  stage: test
  image: python:3.11
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: test_chatbot
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test_chatbot
    REDIS_URL: redis://redis:6379
  before_script:
    - cd backend
    - pip install uv
    - uv sync
  script:
    - alembic upgrade head
    - pytest tests/ -v --cov=src
  coverage: '/TOTAL.*\s+(\d+%)$/'
  only:
    - branches
    - tags

# ==========================================
# BUILD STAGE
# ==========================================
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  only:
    - main
    - develop
    - tags

# ==========================================
# DEPLOY STAGING
# ==========================================
deploy:staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$STAGING_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - ssh -o StrictHostKeyChecking=no $STAGING_USER@$STAGING_HOST "
        cd /opt/chatbot &&
        docker-compose pull app &&
        docker-compose up -d app &&
        docker-compose exec -T app alembic upgrade head
      "
  environment:
    name: staging
    url: https://staging.chatbot.com
  only:
    - develop

# ==========================================
# DEPLOY PRODUCTION
# ==========================================
deploy:production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$PROD_SSH_KEY" | tr -d '\r' | ssh-add -
  script:
    - ssh -o StrictHostKeyChecking=no $PROD_USER@$PROD_HOST "
        cd /opt/chatbot &&
        docker-compose -f docker-compose.prod.yml pull app &&
        docker-compose -f docker-compose.prod.yml up -d app &&
        docker-compose -f docker-compose.prod.yml exec -T app alembic upgrade head
      "
  environment:
    name: production
    url: https://chatbot.com
  when: manual
  only:
    - tags
```

---

## 4. Environment Configuration

### 4.1 Environment Variables

**Development (.env.development):**
```bash
# Application
ENVIRONMENT=development
LOG_LEVEL=DEBUG
API_HOST=0.0.0.0
API_PORT=8000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatbot
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=3600

# Auth (Development - can disable)
DISABLE_AUTH=true
JWT_PUBLIC_KEY=<content>

# LLM
OPENROUTER_API_KEY=your-key-here
```

**Production (.env.production):**
```bash
# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
API_HOST=0.0.0.0
API_PORT=8000

# Database
DATABASE_URL=postgresql://user:password@postgres.internal:5432/chatbot
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40

# Redis
REDIS_URL=redis://redis.internal:6379
CACHE_TTL_SECONDS=7200

# Auth (Production - MUST enable)
DISABLE_AUTH=false
JWT_PUBLIC_KEY=<production-public-key>
JWT_PRIVATE_KEY=<production-private-key>
FERNET_KEY=<encryption-key>

# LLM
OPENROUTER_API_KEY=<production-key>

# Security
CORS_ORIGINS=https://chatbot.com,https://www.chatbot.com
ALLOWED_HOSTS=chatbot.com,www.chatbot.com

# Rate Limiting
DEFAULT_RATE_LIMIT_RPM=60
DEFAULT_RATE_LIMIT_TPM=100000
```

---

## 5. Deployment Strategies

### 5.1 Blue-Green Deployment

```bash
# Deploy new version (green) alongside old (blue)
docker-compose -f docker-compose.prod.yml up -d app-green

# Run health checks
curl -f https://green.chatbot.com/health

# Switch traffic from blue to green (via Nginx config update)
nginx -s reload

# If successful, stop blue
docker-compose -f docker-compose.prod.yml stop app-blue

# If failed, rollback
nginx -s reload  # revert config
docker-compose -f docker-compose.prod.yml stop app-green
```

### 5.2 Rolling Update

```bash
# Scale to 4 instances
docker-compose -f docker-compose.prod.yml up -d --scale app=4

# Update image version
export VERSION=v1.2.0
docker-compose -f docker-compose.prod.yml pull app

# Rolling restart (one by one)
for i in {1..4}; do
  docker-compose -f docker-compose.prod.yml up -d --no-deps --scale app=$((4-i+1)) app
  sleep 30
done
```

---

## 6. Monitoring & Logging

### 6.1 Logging với Structlog

```python
# backend/src/utils/logger.py
import structlog

logger = structlog.get_logger()

# Usage
logger.info("chat_message_received",
            session_id=session_id,
            user_id=user_id,
            message_length=len(message))
```

**Output:**
```json
{
  "event": "chat_message_received",
  "session_id": "abc-123",
  "user_id": "user-xyz",
  "message_length": 50,
  "timestamp": "2025-12-14T10:30:00Z",
  "level": "info"
}
```

### 6.2 Health Check Endpoint

```python
# backend/src/api/health.py
@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute("SELECT 1")

        # Check Redis connection
        redis_client.ping()

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail="Service unavailable")
```

### 6.3 Monitoring Stack (Future)

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  loki:
    image: grafana/loki
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail
    volumes:
      - /var/log:/var/log
```

---

## Tổng Kết

Pipeline & CI/CD được thiết kế để:

✅ **Automated Testing**: Chạy tests tự động trên mỗi commit
✅ **Docker Multi-Stage**: Tối ưu kích thước image
✅ **Environment Separation**: Dev, Staging, Production rõ ràng
✅ **Zero-Downtime Deployment**: Blue-green, rolling updates
✅ **Health Checks**: Tự động kiểm tra sau mỗi deployment
✅ **Monitoring Ready**: Chuẩn bị sẵn cho Prometheus/Grafana

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
