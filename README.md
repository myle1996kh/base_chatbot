## Base Chatbot Platform

This repository contains a full-stack, production-oriented chatbot platform:
- **Backend**: FastAPI service with PostgreSQL + pgvector, Redis, JWT auth, and multi-tenant chat/agent orchestration.
- **Frontend**: React + TypeScript (Vite) application with admin & support dashboards and an embeddable chat widget.
- **Documentation**: Architecture, data model, and integration guides for deploying and operating the chatbot.

The codebase is organized so you can run the backend and frontend independently during development, or together via Docker for deployment.

## Repository Structure

- `backend/` – FastAPI backend service
  - API endpoints for chat, sessions, users, tenants, tools, and admin operations
  - SQLAlchemy models, Alembic migrations, and seed data
  - JWT-based authentication, encryption utilities, and background services
  - See `backend/README.md` for detailed setup, environment variables, and API docs

- `frontend/` – React + Vite frontend
  - Admin and support dashboards (tenants, users, sessions, tools, knowledge base)
  - Chat widget and embedded widget UI
  - Tailwind CSS configuration and routing
  - See `frontend/README.md` for the original app description and dev instructions

- `document-project/` – System documentation
  - `project-overview.md` – high-level summary of the system
  - `architecture-backend.md` / `architecture-frontend.md` – detailed architecture
  - `data-models-backend.md` – database and entity modeling
  - `TENANT_SETUP_GUIDE.md`, `JWT_SETUP_GUIDE.md`, `WIDGET_CONFIG_DATABASE.md` – operational guides

- Root-level files
  - `docker-compose.yml` – multi-service setup (PostgreSQL, Redis, chatbot app)
  - `Dockerfile` – multi-stage build for backend + built frontend in a single image
  - `nginx.conf` – example Nginx configuration for serving the app in production
  - `pyproject.toml` / `uv.lock` – Python dependency management using `uv`
  - `.dockerignore`, `.gitignore`, `.python-version` – tooling & environment config
  - `save_token.py` – helper script for saving tokens (e.g., for CI/CD or local tooling)

## Run with Docker Compose (Recommended)

Prerequisites:
- Docker
- Docker Compose

1. Ensure your backend environment file is configured:
   - Copy `backend/.env.example` to `backend/.env`
   - Update database, Redis, JWT, and other secrets as needed

2. Start the stack:
   ```bash
   docker-compose up --build
   ```

   This will start:
   - `postgres` (PostgreSQL 15 + pgvector)
   - `redis` (Redis 7)
   - `app` (combined backend + built frontend, exposed on port `8000`)

3. After services are healthy, run database migrations (if not handled automatically by your deployment flow). For manual migrations, see `backend/README.md`.

4. Access the application:
   - API (FastAPI): `http://localhost:8000`
   - API docs (Swagger): `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/health`
   - Frontend UI: served by the same `app` container (routes configured in the frontend build)

## Run Backend & Frontend Separately (Development)

### Backend (FastAPI)

Follow the detailed steps in `backend/README.md`. In summary:
- Create and activate a Python 3.11+ virtual environment
- Install dependencies from `backend/requirements.txt` or via `uv` using `pyproject.toml`
- Configure `backend/.env`
- Run the API with:
  ```bash
  python backend/src/main.py
  # or
  uvicorn backend.src.main:app --reload --host 0.0.0.0 --port 8000
  ```

### Frontend (React + Vite)

Inside `frontend/`:
1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Configure any required environment (e.g. API base URL) according to `frontend/README.md`.
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Documentation

For deeper technical details, refer to the documents in `document-project/`, especially:
- `document-project/index.md` – entry point / table of contents
- `document-project/integration-architecture.md` – how this chatbot fits into a broader system
- `document-project/flow_support.md` – support/escalation flows

These documents are the source of truth for the architecture and integration patterns behind this codebase.
