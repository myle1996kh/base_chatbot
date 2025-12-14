---
id: architecture
title: Kiến trúc Hệ thống
sidebar_position: 4
---

# Sơ Đồ Kiến Trúc Hệ Thống
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025

---

## Mục Lục
1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Kiến Trúc Tầng (Layered Architecture)](#2-kiến-trúc-tầng-layered-architecture)
3. [Kiến Trúc Backend](#3-kiến-trúc-backend)
4. [Kiến Trúc Frontend](#4-kiến-trúc-frontend)
5. [Kiến Trúc Database](#5-kiến-trúc-database)
6. [Kiến Trúc Agent System](#6-kiến-trúc-agent-system)
7. [Kiến Trúc Bảo Mật](#7-kiến-trúc-bảo-mật)
8. [Luồng Dữ Liệu End-to-End](#8-luồng-dữ-liệu-end-to-end)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Sơ Đồ Tổng Quan Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL USERS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Admin      │  │  Supporter   │  │  Chat User   │          │
│  │  Dashboard   │  │  Dashboard   │  │    Widget    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                           │
│                  (Load Balancer + SSL)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FASTAPI APPLICATION                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              MIDDLEWARE LAYER                           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │   JWT    │ │  CORS    │ │ Logging  │ │  Tenant  │  │    │
│  │  │   Auth   │ │  Policy  │ │  Track   │ │ Isolation│  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  API ROUTES                             │    │
│  │  /auth │ /admin │ /api/{tenant}/chat │ /health         │    │
│  └────────────────────────┬───────────────────────────────┘    │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                SERVICE LAYER                            │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │  Supervisor  │  │    Domain    │  │     RAG     │  │    │
│  │  │    Agent     │  │    Agents    │  │   Service   │  │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │     LLM      │  │     Tool     │  │ Escalation  │  │    │
│  │  │   Manager    │  │   Registry   │  │   Service   │  │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └────────────────────────┬───────────────────────────────┘    │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              DATA ACCESS LAYER                          │    │
│  │              (SQLAlchemy ORM)                           │    │
│  └────────────────────────┬───────────────────────────────┘    │
└───────────────────────────┼──────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │  LLM APIs    │          │
│  │  + pgvector  │  │   (Cache)    │  │  (External)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Tech Stack Tổng Quan

| Tầng | Công Nghệ | Vai Trò |
|------|-----------|---------|
| **Frontend** | React 18 + TypeScript + Vite | UI Framework |
| **Styling** | Tailwind CSS 4.1 | CSS Framework |
| **Backend** | Python 3.11 + FastAPI | REST API Server |
| **Agent Framework** | LangChain + LangGraph | AI Orchestration |
| **Database** | PostgreSQL 15 + pgvector | Relational DB + Vector Store |
| **Cache** | Redis 7 | Session & Data Cache |
| **Auth** | JWT (RS256) | Authentication |
| **Deployment** | Docker + Docker Compose | Containerization |
| **Web Server** | Gunicorn + Uvicorn | WSGI/ASGI Server |
| **LLM Providers** | OpenAI, Anthropic, OpenRouter | AI Models |

---

## 2. Kiến Trúc Tầng (Layered Architecture)

### 2.1 Sơ Đồ 4 Tầng

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   React    │  │   API      │  │   Pydantic │            │
│  │ Components │  │  Routes    │  │  Schemas   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Agents    │  │  Services  │  │   Tools    │            │
│  │ Supervisor │  │   RAG      │  │  Registry  │            │
│  │   Domain   │  │ Escalation │  │   HTTP     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ SQLAlchemy │  │  Redis     │  │   LLM      │            │
│  │    ORM     │  │  Client    │  │   Client   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORAGE LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │   Redis    │  │  External  │            │
│  │  Database  │  │   Cache    │  │  APIs      │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Trách Nhiệm Từng Tầng

#### **Presentation Layer (Tầng Giao Diện)**
- Hiển thị dữ liệu cho người dùng
- Nhận input từ người dùng
- Validation input phía client
- Route handling (API endpoints)
- Request/Response serialization (Pydantic)

#### **Business Logic Layer (Tầng Logic Nghiệp Vụ)**
- Xử lý logic kinh doanh chính
- Orchestration của agents
- Tool execution
- RAG processing
- Escalation workflow
- LLM interaction

#### **Data Access Layer (Tầng Truy Cập Dữ Liệu)**
- CRUD operations
- Query optimization
- Transaction management
- Caching logic
- External API calls

#### **Data Storage Layer (Tầng Lưu Trữ)**
- Persistent storage (PostgreSQL)
- Temporary storage (Redis)
- External services (LLM APIs)

---

## 3. Kiến Trúc Backend

### 3.1 Cấu Trúc Thư Mục Backend

```
backend/
├── src/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Configuration management
│   │
│   ├── api/                       # API Routes
│   │   ├── auth.py                # Authentication endpoints
│   │   ├── admin.py               # Admin endpoints
│   │   ├── chat.py                # Chat endpoints
│   │   ├── escalation.py          # Escalation endpoints
│   │   └── sse.py                 # Server-Sent Events
│   │
│   ├── middleware/                # Middleware components
│   │   ├── auth.py                # JWT verification
│   │   ├── logging.py             # Request logging
│   │   └── tenant.py              # Tenant isolation
│   │
│   ├── services/                  # Business Logic
│   │   ├── supervisor_agent.py    # Routing agent
│   │   ├── domain_agents.py       # Domain-specific agents
│   │   ├── llm_manager.py         # LLM selection & calls
│   │   ├── rag_service.py         # Vector search
│   │   ├── tool_registry.py       # Tool management
│   │   ├── escalation_service.py  # Human escalation
│   │   ├── conversation_memory.py # Chat history
│   │   └── sse_manager.py         # SSE connections
│   │
│   ├── models/                    # SQLAlchemy Models
│   │   ├── tenant.py              # Tenant model
│   │   ├── user.py                # User models
│   │   ├── agent.py               # Agent configs
│   │   ├── tool.py                # Tool configs
│   │   ├── session.py             # Chat sessions
│   │   └── message.py             # Messages
│   │
│   ├── schemas/                   # Pydantic Schemas
│   │   ├── auth.py                # Auth request/response
│   │   ├── chat.py                # Chat request/response
│   │   └── admin.py               # Admin request/response
│   │
│   ├── utils/                     # Utilities
│   │   ├── jwt.py                 # JWT encode/decode
│   │   ├── encryption.py          # Fernet encryption
│   │   ├── validators.py          # Input validation
│   │   └── logger.py              # Logging setup
│   │
│   └── migrations/                # Alembic migrations
│       ├── env.py                 # Alembic config
│       ├── versions/              # Migration files
│       └── data/                  # Seed data (JSON)
│
├── tests/                         # Test suite
│   ├── unit/                      # Unit tests
│   └── integration/               # Integration tests
│
├── requirements.txt               # Python dependencies
├── pyproject.toml                 # Project config (uv)
└── .env.example                   # Environment template
```

### 3.2 Request Flow trong Backend

```
HTTP Request
    ↓
[1] NGINX (Optional)
    ↓
[2] FastAPI Application
    ↓
[3] Middleware Stack
    ├─ CORS Middleware
    ├─ Logging Middleware (assign request_id)
    ├─ JWT Authentication Middleware
    │  ├─ Verify token
    │  ├─ Extract user_id, tenant_id, roles
    │  └─ Attach to request.state
    └─ Tenant Isolation Middleware
       └─ Verify tenant access
    ↓
[4] Route Handler (API Layer)
    ├─ Parse request body (Pydantic)
    ├─ Validate input
    └─ Call Service Layer
    ↓
[5] Service Layer (Business Logic)
    ├─ SupervisorAgent (if chat endpoint)
    │  ├─ Load agent configs from cache/DB
    │  ├─ LLM call to determine intent
    │  └─ Route to DomainAgent
    ├─ DomainAgent
    │  ├─ Load agent prompt & tools
    │  ├─ Extract entities from user message
    │  ├─ Execute tools in priority order
    │  │  ├─ RAG Tool → pgvector search
    │  │  ├─ HTTP Tool → External API call
    │  │  └─ Custom Tool → Business logic
    │  └─ Format response
    └─ Other Services (RAG, Escalation, etc.)
    ↓
[6] Data Access Layer
    ├─ SQLAlchemy ORM queries
    ├─ Redis cache operations
    └─ LLM API calls
    ↓
[7] Database/External APIs
    ├─ PostgreSQL (read/write)
    ├─ Redis (get/set)
    └─ OpenAI/Anthropic (LLM inference)
    ↓
[8] Response Construction
    ├─ Service returns data to Route
    ├─ Route serializes to Pydantic schema
    └─ FastAPI returns JSON response
    ↓
HTTP Response (or SSE Stream)
```

---

## 4. Kiến Trúc Frontend

### 4.1 Cấu Trúc Thư Mục Frontend

```
frontend/
├── src/
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Router setup
│   ├── index.css                  # Global styles (Tailwind)
│   ├── constants.ts               # App constants
│   │
│   ├── pages/                     # Page components
│   │   ├── LoginPage.tsx          # Login form
│   │   ├── ChatRoomPage.tsx       # Main chat interface
│   │   ├── SupportDashboard.tsx   # Supporter interface
│   │   ├── HistoryPage.tsx        # Chat history
│   │   └── admin/                 # Admin pages
│   │       ├── AdminOverviewPage.tsx
│   │       ├── TenantManagementPage.tsx
│   │       ├── UserManagement.tsx
│   │       ├── AgentManagementPage.tsx
│   │       ├── ToolManagementPage.tsx
│   │       ├── KnowledgeBasePage.tsx
│   │       ├── ChatManagementPage.tsx
│   │       └── EscalationQueuePage.tsx
│   │
│   ├── components/                # Reusable components
│   │   ├── ChatWidget.tsx         # Main chat widget
│   │   ├── EmbeddedWidget.tsx     # Embeddable version
│   │   ├── AdminLayout.tsx        # Admin layout wrapper
│   │   ├── SupportLayout.tsx      # Support layout wrapper
│   │   ├── ProtectedRoute.tsx     # Auth guard
│   │   ├── shared/                # Shared components
│   │   │   ├── MessageInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── EscalationDialog.tsx
│   │   └── icons.tsx              # Icon components
│   │
│   ├── services/                  # API clients
│   │   ├── authService.ts         # Login/logout
│   │   ├── chatService.ts         # Chat API
│   │   ├── sessionService.ts      # Session management
│   │   ├── escalationService.ts   # Escalation API
│   │   ├── tenantService.ts       # Tenant admin
│   │   ├── userService.ts         # User management
│   │   ├── agentService.ts        # Agent config
│   │   ├── toolService.ts         # Tool management
│   │   ├── knowledgeService.ts    # Document upload
│   │   └── adminService.ts        # Admin operations
│   │
│   ├── types/                     # TypeScript types
│   │   ├── auth.ts                # Auth types
│   │   ├── chat.ts                # Chat types
│   │   └── admin.ts               # Admin types
│   │
│   └── utils/                     # Utility functions
│       ├── formatters.ts          # Data formatters
│       └── validators.ts          # Input validators
│
├── public/                        # Static assets
│   └── index.html                 # HTML template
│
├── package.json                   # NPM dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite bundler config
└── tailwind.config.js             # Tailwind CSS config
```

### 4.2 Component Hierarchy

```
App.tsx (Router)
│
├── LoginPage
│
├── AdminLayout
│   ├── Sidebar Navigation
│   └── Outlet (nested routes)
│       ├── AdminOverviewPage
│       ├── TenantManagementPage
│       ├── UserManagement
│       ├── AgentManagementPage
│       ├── ToolManagementPage
│       ├── KnowledgeBasePage
│       └── ChatManagementPage
│
├── SupportLayout
│   ├── Header
│   └── SupportDashboard
│       ├── EscalationQueue (list)
│       └── ChatWindow (detail)
│           ├── MessageList
│           └── MessageInput
│
└── ChatRoomPage
    └── ChatWidget
        ├── MessageList
        │   └── Message (user/assistant/supporter)
        ├── MessageInput
        └── EscalationDialog
```

### 4.3 State Management

```
┌─────────────────────────────────────────┐
│         LOCAL STORAGE                    │
│  ┌───────────────────────────────────┐  │
│  │  token: JWT token                 │  │
│  │  user: { user_id, role, ... }     │  │
│  │  session_id: current chat session │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ▲
                  │ read/write
                  │
┌─────────────────────────────────────────┐
│        REACT COMPONENT STATE             │
│  ┌───────────────────────────────────┐  │
│  │  useState() for local state       │  │
│  │  useEffect() for side effects     │  │
│  │  React Context (if needed)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  │
                  │ API calls
                  ▼
┌─────────────────────────────────────────┐
│          API SERVICES                    │
│  ┌───────────────────────────────────┐  │
│  │  axios instances with:            │  │
│  │  - baseURL                        │  │
│  │  - Authorization header           │  │
│  │  - Error interceptors             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 5. Kiến Trúc Database

### 5.1 Database Schema - ER Diagram (Simplified)

```
┌──────────────┐
│   Tenant     │
│──────────────│
│ tenant_id PK │◄────┐
│ name         │     │
│ domain       │     │
│ status       │     │
└──────────────┘     │
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       │             │             │
┌──────▼──────┐ ┌───▼─────────┐ ┌─▼────────────┐
│    User     │ │ ChatSession │ │ AgentConfig  │
│─────────────│ │─────────────│ │──────────────│
│ user_id  PK │ │ session_id  │ │ agent_id  PK │
│ email       │ │ tenant_id FK│ │ name         │
│ role        │ │ user_id  FK │ │ prompt       │
│ tenant_id FK│ │ agent_id FK │ │ llm_model_id │
│ password_h  │ │ escalation  │ │ is_active    │
└─────────────┘ └───┬─────────┘ └──┬───────────┘
                    │               │
                    │               │ M:N
                    │          ┌────▼─────────┐
                ┌───▼──────┐   │  AgentTools  │
                │ Message  │   │──────────────│
                │──────────│   │ agent_id  FK │
                │message_id│   │ tool_id   FK │
                │session_id│   │ priority     │
                │ role     │   └────┬─────────┘
                │ content  │        │
                │timestamp │        │
                └──────────┘   ┌────▼─────────┐
                               │ ToolConfig   │
                               │──────────────│
                               │ tool_id   PK │
                               │ name         │
                               │ config(JSON) │
                               │ is_active    │
                               └──────────────┘
```

### 5.2 Các Bảng Chính

| Bảng | Chức năng | Indexes quan trọng |
|------|-----------|-------------------|
| `tenants` | Quản lý tổ chức | `tenant_id` (PK) |
| `users` | Tài khoản người dùng | `user_id` (PK), `(tenant_id, email)` (Unique) |
| `chat_users` | Khách hàng cuối | `user_id` (PK) |
| `chat_sessions` | Phiên chat | `session_id` (PK), `(tenant_id, user_id, created_at)` |
| `messages` | Tin nhắn | `message_id` (PK), `(session_id, timestamp)` |
| `agent_configs` | Cấu hình agents | `agent_id` (PK), `name` (Unique) |
| `tool_configs` | Cấu hình tools | `tool_id` (PK) |
| `agent_tools` | Agent-Tool mapping | `(agent_id, tool_id)` (PK) |
| `tenant_agent_permissions` | Quyền agent | `(tenant_id, agent_id)` (PK) |
| `tenant_tool_permissions` | Quyền tool | `(tenant_id, tool_id)` (PK) |
| `llm_models` | Định nghĩa LLM | `model_id` (PK) |
| `output_formats` | Format output | `format_id` (PK) |

### 5.3 Chiến Lược Indexing

```sql
-- High-traffic queries
CREATE INDEX ix_sessions_tenant_user ON chat_sessions(tenant_id, user_id, created_at);
CREATE INDEX ix_sessions_escalation ON chat_sessions(escalation_status, created_at);
CREATE INDEX ix_messages_session_timestamp ON messages(session_id, timestamp);

-- Vector search (pgvector)
CREATE INDEX vector_embedding_idx ON vector_store
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search (if needed)
CREATE INDEX message_content_fts ON messages
USING gin(to_tsvector('english', content));
```

### 5.4 Data Partitioning Strategy (Future)

```
-- Partition messages by month (time-series data)
CREATE TABLE messages (
    message_id UUID,
    timestamp TIMESTAMP,
    ...
) PARTITION BY RANGE (timestamp);

CREATE TABLE messages_2025_01 PARTITION OF messages
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE messages_2025_02 PARTITION OF messages
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

---

## 6. Kiến Trúc Agent System

### 6.1 Sơ Đồ Agent Orchestration

```
User Message
    ↓
┌───────────────────────────────────────────────────┐
│           SUPERVISOR AGENT                         │
│                                                    │
│  1. Load all agents from database                 │
│  2. Send user message + agent list to LLM         │
│  3. LLM determines:                                │
│     - SINGLE_INTENT → route to 1 agent            │
│     - MULTI_INTENT → route to multiple agents     │
│     - UNCLEAR → return clarification request      │
│                                                    │
│  Output: { agent_name, intent, confidence }       │
└───────────────┬───────────────────────────────────┘
                ▼
┌───────────────────────────────────────────────────┐
│          DOMAIN AGENT (e.g., DebtAgent)           │
│                                                    │
│  1. Load agent config (prompt, tools)             │
│  2. Extract entities from user message            │
│     - Use LLM to identify: account_number,        │
│       customer_id, order_id, etc.                 │
│  3. Select tools based on priority                │
│  4. Execute tools sequentially                    │
│     ┌─────────────────────────────────────┐      │
│     │  TOOL EXECUTION                     │      │
│     │  ┌───────────────┐ ┌──────────────┐ │      │
│     │  │   RAG Tool    │ │  HTTP Tool   │ │      │
│     │  │───────────────│ │──────────────│ │      │
│     │  │ 1. Query      │ │ 1. Build URL │ │      │
│     │  │    pgvector   │ │ 2. Auth      │ │      │
│     │  │ 2. Get top-k  │ │ 3. Call API  │ │      │
│     │  │    chunks     │ │ 4. Parse     │ │      │
│     │  │ 3. Return     │ │    response  │ │      │
│     │  │    context    │ │              │ │      │
│     │  └───────────────┘ └──────────────┘ │      │
│     └─────────────────────────────────────┘      │
│  5. Aggregate tool results                        │
│  6. Send to LLM with:                             │
│     - Agent system prompt                         │
│     - User message                                │
│     - Tool results                                │
│     - Conversation history                        │
│  7. LLM generates response                        │
│  8. Apply output format                           │
│                                                    │
│  Output: { response, metadata }                   │
└───────────────┬───────────────────────────────────┘
                ▼
         Save to Database
         Stream to Frontend
```

### 6.2 LLM Selection Strategy

```
Request comes in
    ↓
┌─────────────────────────────────────────┐
│      LLM MANAGER                         │
│                                          │
│  1. Check Tenant LLM Config              │
│     ├─ Has custom API key? → Use it     │
│     └─ No? → Continue                    │
│                                          │
│  2. Check Agent Default Model            │
│     ├─ Agent has llm_model_id?           │
│     │  → Use that model                  │
│     └─ No? → Continue                    │
│                                          │
│  3. Use System Default Model             │
│     └─ Fallback to configured default    │
│                                          │
│  4. Select Provider Client               │
│     ├─ OpenAI → OpenAI SDK               │
│     ├─ Anthropic → Anthropic SDK         │
│     ├─ Google → Google GenAI SDK         │
│     └─ OpenRouter → OpenRouter API       │
│                                          │
│  5. Execute LLM Call                     │
│     ├─ With retry logic                  │
│     ├─ Rate limiting check               │
│     └─ Token counting                    │
│                                          │
│  Output: LLM response                    │
└─────────────────────────────────────────┘
```

### 6.3 Tool Registry Architecture

```
┌─────────────────────────────────────────┐
│         TOOL REGISTRY                    │
│                                          │
│  on_startup():                           │
│    1. Load all ToolConfig from DB       │
│    2. Load BaseTool definitions         │
│    3. Build tool_map: {                 │
│         tool_id → Tool Instance         │
│       }                                  │
│    4. Cache in Redis                    │
│                                          │
│  get_tools_for_agent(agent_id):         │
│    1. Query AgentTools table            │
│    2. Filter by priority                │
│    3. Check tenant permissions          │
│    4. Return enabled tools only         │
│                                          │
│  execute_tool(tool_id, params):         │
│    1. Validate params vs JSON schema    │
│    2. Get tool instance from map        │
│    3. Call tool.execute(params)         │
│    4. Return result                     │
│                                          │
└─────────────────────────────────────────┘

Tool Types:

1. RAG_TOOL
   ├─ Search pgvector
   ├─ Filter by tenant_id
   └─ Return relevant chunks

2. HTTP_TOOL
   ├─ GET/POST/PUT/DELETE
   ├─ Custom headers & auth
   ├─ Response parsing
   └─ Error handling

3. CUSTOM_TOOL
   ├─ Python function
   ├─ Database queries
   └─ Business logic
```

---

## 7. Kiến Trúc Bảo Mật

### 7.1 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: NETWORK                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  - HTTPS enforced in production                    │     │
│  │  - CORS policy (allowed origins)                   │     │
│  │  - Rate limiting (60 RPM default)                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 2: AUTHENTICATION                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  JWT (RS256) with public/private key pair         │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  Token Payload:                          │     │     │
│  │  │  {                                       │     │     │
│  │  │    "sub": "user_id",                     │     │     │
│  │  │    "roles": ["admin"],                   │     │     │
│  │  │    "tenant_id": "uuid",                  │     │     │
│  │  │    "exp": timestamp                      │     │     │
│  │  │  }                                       │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │  - Token expiration: 24 hours                      │     │
│  │  - Refresh token mechanism (future)                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 3: AUTHORIZATION                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Role-Based Access Control (RBAC)                 │     │
│  │  ┌──────────────┬─────────────────────────┐       │     │
│  │  │ Role         │ Permissions              │       │     │
│  │  ├──────────────┼─────────────────────────┤       │     │
│  │  │ admin        │ Full system access       │       │     │
│  │  │ supporter    │ Escalation queue + chat  │       │     │
│  │  │ tenant_user  │ Tenant config only       │       │     │
│  │  │ chat_user    │ Chat only                │       │     │
│  │  └──────────────┴─────────────────────────┘       │     │
│  │                                                     │     │
│  │  Tenant Isolation:                                 │     │
│  │  - Every query filtered by tenant_id               │     │
│  │  - Middleware enforces tenant scope                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 4: DATA PROTECTION                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │  1. Passwords: bcrypt hashing                      │     │
│  │  2. API Keys: Fernet encryption at rest            │     │
│  │  3. SQL Injection: ORM parameterized queries       │     │
│  │  4. XSS: Input sanitization + CSP headers          │     │
│  │  5. CSRF: SameSite cookies (future)                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 5: AUDIT & MONITORING                │
│  ┌────────────────────────────────────────────────────┐     │
│  │  - Structured logging (structlog)                  │     │
│  │  - Unique request_id per request                   │     │
│  │  - Security event logging                          │     │
│  │  - Failed login attempts tracking                  │     │
│  │  - Anomaly detection (future)                      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 JWT Flow

```
┌────────────┐                                    ┌────────────┐
│   Client   │                                    │   Server   │
└──────┬─────┘                                    └──────┬─────┘
       │                                                 │
       │  1. POST /api/auth/login                       │
       │    { email, password }                         │
       ├────────────────────────────────────────────────►
       │                                                 │
       │                         2. Verify password     │
       │                            (bcrypt compare)    │
       │                                                 │
       │                         3. Generate JWT        │
       │                            with RS256          │
       │                                                 │
       │  4. Return token                               │
       │◄────────────────────────────────────────────────┤
       │    { token: "eyJ...", user: {...} }            │
       │                                                 │
       │  5. Store in localStorage                      │
       │                                                 │
       │  6. Subsequent requests                        │
       │     Authorization: Bearer <token>              │
       ├────────────────────────────────────────────────►
       │                                                 │
       │                         7. Verify JWT          │
       │                            - Signature check   │
       │                            - Expiration check  │
       │                            - Extract payload   │
       │                                                 │
       │  8. Return protected resource                  │
       │◄────────────────────────────────────────────────┤
       │                                                 │
```

---

## 8. Luồng Dữ Liệu End-to-End

### 8.1 Luồng Chat Hoàn Chỉnh

```
[1] USER ACTION
    User types message in ChatWidget
    ↓

[2] FRONTEND
    ├─ chatService.sendMessage(session_id, message)
    ├─ Add Authorization header with JWT
    └─ POST /api/{tenant_id}/chat
    ↓

[3] BACKEND - API LAYER
    ├─ Middleware: Verify JWT
    ├─ Middleware: Check tenant access
    ├─ Parse ChatRequest (Pydantic)
    └─ Call chat_endpoint(request)
    ↓

[4] BACKEND - SUPERVISOR AGENT
    ├─ Load agent configs from Redis/DB
    ├─ Call LLM with:
    │  ├─ User message
    │  └─ Agent list
    ├─ LLM returns intent classification:
    │  └─ { agent_name: "DebtAgent", intent: "SINGLE_INTENT" }
    └─ Route to DomainAgent
    ↓

[5] BACKEND - DOMAIN AGENT
    ├─ Load DebtAgent config
    ├─ Extract entities (LLM call):
    │  └─ { account_number: "12345" }
    ├─ Load tools for agent (priority order)
    │  ├─ RAG_TOOL (priority 1)
    │  └─ HTTP_TOOL (priority 2)
    └─ Execute tools
    ↓

[6] BACKEND - TOOL EXECUTION
    ├─ RAG_TOOL:
    │  ├─ Generate query embedding
    │  ├─ Search pgvector with tenant_id filter
    │  └─ Return top-k chunks: [chunk1, chunk2, chunk3]
    │
    ├─ HTTP_TOOL:
    │  ├─ Build API URL with extracted entities
    │  ├─ Call external API
    │  └─ Return: { debt_amount: 5000, status: "pending" }
    │
    └─ Aggregate results:
       └─ tool_results = { rag_context: "...", api_data: {...} }
    ↓

[7] BACKEND - RESPONSE GENERATION
    ├─ Call LLM with:
    │  ├─ Agent system prompt
    │  ├─ User message
    │  ├─ Tool results
    │  └─ Conversation history (last 5 messages)
    │
    ├─ LLM generates response:
    │  └─ "Số tiền nợ của bạn là 5.000.000 VNĐ. Vui lòng thanh toán..."
    │
    └─ Apply output format (if configured)
    ↓

[8] BACKEND - PERSISTENCE
    ├─ Save Message to DB:
    │  ├─ role: "user", content: user_message
    │  └─ role: "assistant", content: agent_response
    │
    ├─ Update ChatSession:
    │  └─ last_message_at: now()
    │
    └─ Log to structlog with metadata:
       └─ { tokens: 350, latency: 1.2s, intent: "debt_inquiry" }
    ↓

[9] BACKEND - RESPONSE
    ├─ Return ChatResponse (JSON or SSE stream)
    └─ Status code: 200
    ↓

[10] FRONTEND
    ├─ Receive response
    ├─ Parse JSON
    ├─ Add message to MessageList
    ├─ Render markdown
    └─ Update UI
    ↓

[11] USER
    ├─ Sees agent response
    └─ Can continue chatting or escalate
```

### 8.2 Luồng Escalation

```
[1] USER ACTION
    User clicks "Talk to Human" button
    ↓

[2] FRONTEND
    ├─ escalationService.requestEscalation(session_id, reason)
    └─ POST /api/{tenant_id}/chat/escalate
    ↓

[3] BACKEND
    ├─ Verify JWT & tenant access
    ├─ Find ChatSession by session_id
    ├─ Update escalation_status: "none" → "pending"
    ├─ Save escalation reason
    ├─ Notify supporters (SSE broadcast)
    └─ Return success response
    ↓

[4] SUPPORTER DASHBOARD
    ├─ SSE connection receives new escalation event
    ├─ Update escalation queue UI
    └─ Show notification
    ↓

[5] SUPPORTER ACTION
    Supporter clicks "Accept" on escalation
    ↓

[6] FRONTEND (Supporter)
    ├─ escalationService.assignEscalation(session_id, supporter_id)
    └─ POST /api/{tenant_id}/supporter/assign
    ↓

[7] BACKEND
    ├─ Update ChatSession:
    │  ├─ escalation_status: "pending" → "assigned"
    │  └─ assigned_user_id: supporter_id
    ├─ Notify customer via SSE
    └─ Return success
    ↓

[8] LIVE CHAT
    ├─ Supporter and Customer both connected via SSE
    ├─ Messages sent via POST /api/{tenant_id}/supporter/message
    ├─ Messages broadcast to both parties in real-time
    └─ role: "supporter" distinguishes supporter messages
    ↓

[9] RESOLUTION
    Supporter clicks "Resolve"
    ├─ Update escalation_status: "assigned" → "resolved"
    ├─ Session removed from queue
    └─ Customer can continue or start new chat
```

---

## Tổng Kết

Kiến trúc hệ thống được thiết kế với các nguyên tắc:

1. **Separation of Concerns**: Tách biệt rõ ràng giữa các tầng
2. **Multi-Tenancy**: Cách ly dữ liệu nghiêm ngặt
3. **Scalability**: Hỗ trợ horizontal scaling
4. **Security**: Bảo mật nhiều tầng
5. **Extensibility**: Dễ dàng thêm agents, tools mới
6. **Observability**: Logging, monitoring đầy đủ

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
