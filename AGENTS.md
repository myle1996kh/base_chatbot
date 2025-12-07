# Repository Guidelines

## Project Structure & Module Organization
- Backend API: `backend/src/` (FastAPI services, models, middleware, utils), config in `backend/src/config.py`, entry in `backend/src/main.py`.
- Frontend web app: `frontend/` (React + Vite + TypeScript); routes/components in `frontend/pages` and `frontend/components`.
- Data & migrations: `backend/migrations/`, Alembic env in `backend/alembic/`.
- Tests: backend API tests in `backend/tests/`; Bruno collections in `backend/tests/Chatbot/`.
- Docs and plans: `document-project/` (architecture/flows) and `docs/` (implementation plans).

## Build, Test, and Development Commands
- Backend setup: `cd backend && pip install -r requirements.txt`.
- Migrations: `cd backend && alembic upgrade head` (apply DB schema).
- Run backend (dev): `cd backend && python src/main.py` (honors env in `.env`/settings).
- Frontend setup: `cd frontend && npm install`.
- Frontend dev server: `cd frontend && npm run dev`.
- Docker (full stack): `docker-compose up` (uses root `docker-compose.yml`).

## Coding Style & Naming Conventions
- Python: format with `black`, lint with `ruff`, type-check with `mypy`; prefer snake_case for vars/functions, PascalCase for classes.
- TypeScript/React: use functional components, hooks-first patterns, file names in PascalCase for components and camelCase for utilities.
- Keep modules small and tenant-aware; avoid side effects at import time (see auth middleware pattern).

## Testing Guidelines
- Backend: `cd backend && pytest` (async-friendly). Add tests under `backend/tests/` mirroring module paths.
- Test naming: `test_<unit>.py` files; functions `test_<behavior>`.
- Target: cover new endpoints/services with unit or integration tests; keep fixtures in `backend/tests/conftest.py`.

## Commit & Pull Request Guidelines
- Commits: short, imperative subjects (e.g., `Add websocket manager`, `Fix escalation auth`). Squash locally only if requested.
- PRs: include a clear summary, linked issue/ticket, and screenshots or curl/Bruno snippets for API/UI changes. Note migration impacts and rollout flags (e.g., SSE vs WS).

## Security & Configuration Tips
- Honor multi-tenancy: always filter by `tenant_id` in queries and authorization checks.
- Secrets/keys: load via environment; never commit credentials. JWT keys live in `backend/jwt_private.pem`/`jwt_public.pem` locally—replace via env in real deployments.
- Realtime: during WS migration, keep SSE fallback until metrics (connect success, latency) are stable.
