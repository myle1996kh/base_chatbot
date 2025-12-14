# Mô Hình Dữ Liệu
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025
**Database:** PostgreSQL 15+ với pgvector extension

---

## Mục Lục
1. [Tổng Quan Database Schema](#1-tổng-quan-database-schema)
2. [Chi Tiết Các Bảng](#2-chi-tiết-các-bảng)
3. [Quan Hệ Giữa Các Bảng](#3-quan-hệ-giữa-các-bảng)
4. [Indexes & Performance](#4-indexes--performance)
5. [Data Types & Constraints](#5-data-types--constraints)
6. [Migration Strategy](#6-migration-strategy)

---

## 1. Tổng Quan Database Schema

### 1.1 ER Diagram Tổng Quan

```
┌──────────────────┐
│     tenants      │──┐
│──────────────────│  │
│ tenant_id    PK  │  │
│ name             │  │
│ domain           │  │
│ status           │  │
│ created_at       │  │
└──────────────────┘  │
                      │
         ┌────────────┼────────────┬────────────────┐
         │            │            │                │
         │            │            │                │
┌────────▼─────┐ ┌───▼────────┐ ┌─▼──────────┐ ┌──▼──────────────┐
│    users     │ │  sessions  │ │agent_configs│ │tenant_llm_config│
│──────────────│ │────────────│ │─────────────│ │─────────────────│
│ user_id   PK │ │session_id  │ │ agent_id PK │ │ config_id    PK │
│ email        │ │tenant_id FK│ │ name        │ │ tenant_id    FK │
│ password_hash│ │user_id  FK │ │ prompt      │ │ provider        │
│ role         │ │agent_id FK │ │ llm_id   FK │ │ api_key_enc     │
│ tenant_id FK │ │escalation  │ │ is_active   │ │ rate_limit      │
└──────────────┘ │thread_id   │ └─┬───────────┘ └─────────────────┘
                 │created_at  │   │
                 └──┬─────────┘   │
                    │              │ M:N
         ┌──────────┴──┐      ┌───▼──────────┐
┌────────▼───────┐     │      │ agent_tools  │
│   messages     │     │      │──────────────│
│────────────────│     │      │ agent_id  FK │
│ message_id  PK │     │      │ tool_id   FK │
│ session_id  FK │     │      │ priority     │
│ role           │     │      └───┬──────────┘
│ content        │     │          │
│ timestamp      │     │     ┌────▼──────────┐
│ metadata(JSON) │     │     │ tool_configs  │
└────────────────┘     │     │───────────────│
                       │     │ tool_id    PK │
┌──────────────────┐   │     │ name          │
│  chat_users      │   │     │ type          │
│──────────────────│   │     │ config (JSON) │
│ user_id       PK │───┘     │ input_schema  │
│ name             │         │ is_active     │
│ email (optional) │         └───────────────┘
│ metadata (JSON)  │
└──────────────────┘

┌──────────────────────┐       ┌─────────────────────┐
│tenant_agent_perms    │       │ tenant_tool_perms   │
│──────────────────────│       │─────────────────────│
│ tenant_id         FK │       │ tenant_id        FK │
│ agent_id          FK │       │ tool_id          FK │
│ enabled              │       │ enabled             │
│ output_format_override│      └─────────────────────┘
└──────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   llm_models     │       │ output_formats   │
│──────────────────│       │──────────────────│
│ model_id      PK │       │ format_id     PK │
│ provider         │       │ name             │
│ model_name       │       │ description      │
│ description      │       │ template (JSON)  │
│ capabilities     │       └──────────────────┘
└──────────────────┘

┌──────────────────────────────┐
│      vector_store            │
│      (pgvector extension)    │
│──────────────────────────────│
│ id                        PK │
│ content                 TEXT │
│ embedding          VECTOR(384)│
│ metadata                JSON │
│   ├─ tenant_id               │
│   ├─ source                  │
│   ├─ created_at              │
│   └─ page_number             │
└──────────────────────────────┘
```

---

## 2. Chi Tiết Các Bảng

### 2.1 Bảng `tenants` - Quản Lý Tổ Chức

**Mục đích:** Lưu trữ thông tin các tổ chức sử dụng platform (multi-tenancy)

```sql
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
        -- 'active', 'inactive', 'suspended'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_tenant_name UNIQUE (name),
    CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_tenants_status ON tenants(status);
```

**Sample Data:**
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Công ty ABC",
  "domain": "abc.com",
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### 2.2 Bảng `users` - Người Dùng Hệ Thống

**Mục đích:** Quản lý admin, supporter, tenant users

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    display_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    role VARCHAR(50) NOT NULL,
        -- 'admin', 'supporter', 'tenant_user'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,

    -- Supporter specific fields
    supporter_capacity INTEGER DEFAULT 5,
    supporter_status VARCHAR(50) DEFAULT 'available',
        -- 'available', 'busy', 'offline'

    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
    CONSTRAINT check_role CHECK (role IN ('admin', 'supporter', 'tenant_user'))
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Sample Data:**
```json
{
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@abc.com",
  "username": "admin",
  "display_name": "Nguyễn Văn A",
  "role": "admin",
  "is_active": true
}
```

---

### 2.3 Bảng `chat_users` - Khách Hàng Cuối

**Mục đích:** Lưu thông tin khách hàng sử dụng chat widget

```sql
CREATE TABLE chat_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    metadata JSONB,
        -- { "ip": "...", "user_agent": "...", "custom_fields": {} }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_users_email ON chat_users(email) WHERE email IS NOT NULL;
```

---

### 2.4 Bảng `chat_sessions` - Phiên Chat

**Mục đích:** Theo dõi các cuộc hội thoại

```sql
CREATE TABLE chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES chat_users(user_id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agent_configs(agent_id) ON DELETE SET NULL,
    thread_id VARCHAR(255),  -- LangGraph thread ID

    -- Escalation fields
    escalation_status VARCHAR(50) DEFAULT 'none',
        -- 'none', 'pending', 'assigned', 'resolved'
    escalation_reason TEXT,
    assigned_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    escalated_at TIMESTAMP,
    resolved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_escalation_status CHECK (
        escalation_status IN ('none', 'pending', 'assigned', 'resolved')
    )
);

CREATE INDEX idx_sessions_tenant_user ON chat_sessions(tenant_id, user_id, created_at DESC);
CREATE INDEX idx_sessions_escalation ON chat_sessions(escalation_status, created_at)
    WHERE escalation_status != 'none';
CREATE INDEX idx_sessions_assigned ON chat_sessions(assigned_user_id, escalation_status);
```

---

### 2.5 Bảng `messages` - Tin Nhắn

**Mục đích:** Lưu trữ tất cả tin nhắn trong hội thoại

```sql
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
        -- 'user', 'assistant', 'supporter', 'system'
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- For human messages (escalation)
    sender_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB,
        -- {
        --   "intent": "debt_inquiry",
        --   "tool_calls": ["RAG_TOOL", "HTTP_TOOL"],
        --   "token_count": 350,
        --   "latency_ms": 1200,
        --   "confidence": 0.95
        -- }

    CONSTRAINT check_role CHECK (role IN ('user', 'assistant', 'supporter', 'system'))
);

CREATE INDEX idx_messages_session_timestamp ON messages(session_id, timestamp);
CREATE INDEX idx_messages_role ON messages(role);

-- Full-text search (optional)
CREATE INDEX idx_messages_content_fts ON messages
    USING gin(to_tsvector('english', content));
```

---

### 2.6 Bảng `agent_configs` - Cấu Hình Agents

**Mục đích:** Định nghĩa các AI agents

```sql
CREATE TABLE agent_configs (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    prompt_template TEXT NOT NULL,
    llm_model_id UUID REFERENCES llm_models(model_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_active ON agent_configs(is_active);
```

**Sample Data:**
```json
{
  "agent_id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "DebtAgent",
  "description": "Xử lý các câu hỏi về công nợ",
  "prompt_template": "Bạn là chuyên gia tư vấn công nợ...",
  "llm_model_id": "880e8400-e29b-41d4-a716-446655440003",
  "is_active": true
}
```

---

### 2.7 Bảng `llm_models` - Cấu Hình LLM

**Mục đích:** Danh sách các LLM models có sẵn

```sql
CREATE TABLE llm_models (
    model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
        -- 'openai', 'anthropic', 'google', 'openrouter'
    model_name VARCHAR(100) NOT NULL,
        -- 'gpt-4', 'claude-3-opus', etc.
    description TEXT,
    capabilities JSONB,
        -- { "max_tokens": 8192, "supports_tools": true }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_provider_model UNIQUE (provider, model_name)
);

CREATE INDEX idx_llm_provider ON llm_models(provider);
```

**Sample Data:**
```json
{
  "model_id": "880e8400-e29b-41d4-a716-446655440003",
  "provider": "openai",
  "model_name": "gpt-4",
  "description": "GPT-4 by OpenAI",
  "capabilities": {
    "max_tokens": 8192,
    "supports_tools": true,
    "supports_vision": false
  }
}
```

---

### 2.8 Bảng `tool_configs` - Cấu Hình Tools

**Mục đích:** Định nghĩa các tools mà agents có thể sử dụng

```sql
CREATE TABLE tool_configs (
    tool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50) NOT NULL,
        -- 'HTTP', 'RAG', 'CUSTOM'
    config JSONB NOT NULL,
        -- Tool-specific configuration
        -- For HTTP: { "base_url", "endpoint", "method", "headers" }
        -- For RAG: { "collection_name", "top_k" }
    input_schema JSONB,
        -- JSON schema for input validation
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_tool_type CHECK (type IN ('HTTP', 'RAG', 'CUSTOM'))
);

CREATE INDEX idx_tools_type ON tool_configs(type);
CREATE INDEX idx_tools_active ON tool_configs(is_active);
```

**Sample Data:**
```json
{
  "tool_id": "990e8400-e29b-41d4-a716-446655440004",
  "name": "OrderAPI",
  "type": "HTTP",
  "config": {
    "base_url": "https://api.example.com",
    "endpoint": "/orders/{order_id}",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {api_key}"
    }
  },
  "input_schema": {
    "type": "object",
    "properties": {
      "order_id": { "type": "string" }
    },
    "required": ["order_id"]
  }
}
```

---

### 2.9 Bảng `agent_tools` - Agent-Tool Mapping

**Mục đích:** Gán tools cho agents với độ ưu tiên

```sql
CREATE TABLE agent_tools (
    agent_id UUID NOT NULL REFERENCES agent_configs(agent_id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tool_configs(tool_id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,  -- 1 = highest priority
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (agent_id, tool_id)
);

CREATE INDEX idx_agent_tools_priority ON agent_tools(agent_id, priority);
```

---

### 2.10 Bảng `tenant_agent_permissions` - Quyền Agent

**Mục đích:** Kiểm soát agents nào tenant có thể sử dụng

```sql
CREATE TABLE tenant_agent_permissions (
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent_configs(agent_id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    output_format_override UUID REFERENCES output_formats(format_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, agent_id)
);

CREATE INDEX idx_tenant_agent_enabled ON tenant_agent_permissions(tenant_id, enabled);
```

---

### 2.11 Bảng `tenant_tool_permissions` - Quyền Tool

**Mục đích:** Kiểm soát tools nào tenant có thể sử dụng

```sql
CREATE TABLE tenant_tool_permissions (
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tool_configs(tool_id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, tool_id)
);

CREATE INDEX idx_tenant_tool_enabled ON tenant_tool_permissions(tenant_id, enabled);
```

---

### 2.12 Bảng `tenant_llm_configs` - LLM Config theo Tenant

**Mục đích:** Cho phép tenant sử dụng API keys riêng

```sql
CREATE TABLE tenant_llm_configs (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
        -- 'openai', 'anthropic', 'google', 'openrouter'
    api_key_encrypted TEXT NOT NULL,  -- Fernet encrypted
    default_model VARCHAR(100),
    rate_limit_rpm INTEGER DEFAULT 60,
    rate_limit_tpm INTEGER DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider)
);

CREATE INDEX idx_tenant_llm_tenant ON tenant_llm_configs(tenant_id);
```

---

### 2.13 Bảng `output_formats` - Format Output

**Mục đích:** Định nghĩa cách format response của agent

```sql
CREATE TABLE output_formats (
    format_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    template JSONB NOT NULL,
        -- { "structure": "...", "fields": [...] }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2.14 Bảng `vector_store` - Vector Database

**Mục đích:** Lưu trữ embeddings cho RAG

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(384),  -- 384-dimensional vector
    metadata JSONB NOT NULL,
        -- {
        --   "tenant_id": "...",
        --   "source": "manual.pdf",
        --   "page_number": 3,
        --   "created_at": "..."
        -- }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector similarity index (cosine distance)
CREATE INDEX vector_embedding_idx ON vector_store
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Tenant isolation index
CREATE INDEX idx_vector_tenant ON vector_store
    ((metadata->>'tenant_id'));

-- Source tracking
CREATE INDEX idx_vector_source ON vector_store
    ((metadata->>'source'));
```

**Sample Query:**
```sql
-- Tìm kiếm vector tương đồng với tenant isolation
SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM vector_store
WHERE metadata->>'tenant_id' = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

---

## 3. Quan Hệ Giữa Các Bảng

### 3.1 One-to-Many Relationships

```
tenants (1) ──── (N) users
tenants (1) ──── (N) chat_sessions
tenants (1) ──── (N) tenant_agent_permissions
tenants (1) ──── (N) tenant_tool_permissions
tenants (1) ──── (N) tenant_llm_configs

chat_users (1) ──── (N) chat_sessions
chat_sessions (1) ──── (N) messages

agent_configs (1) ──── (N) chat_sessions
llm_models (1) ──── (N) agent_configs

users (1) ──── (N) chat_sessions  -- as assigned_user_id
users (1) ──── (N) messages        -- as sender_user_id
```

### 3.2 Many-to-Many Relationships

```
agent_configs (N) ──── (N) tool_configs
    via agent_tools (junction table)

tenants (N) ──── (N) agent_configs
    via tenant_agent_permissions

tenants (N) ──── (N) tool_configs
    via tenant_tool_permissions
```

---

## 4. Indexes & Performance

### 4.1 Critical Indexes

```sql
-- High-traffic query optimization
CREATE INDEX idx_sessions_tenant_user_date
    ON chat_sessions(tenant_id, user_id, created_at DESC);

CREATE INDEX idx_messages_session_timestamp
    ON messages(session_id, timestamp);

CREATE INDEX idx_sessions_escalation_pending
    ON chat_sessions(escalation_status, created_at)
    WHERE escalation_status = 'pending';

-- Vector search optimization
CREATE INDEX vector_embedding_idx ON vector_store
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Full-text search (optional)
CREATE INDEX idx_messages_content_fts ON messages
    USING gin(to_tsvector('english', content));
```

### 4.2 Query Performance Examples

```sql
-- Query 1: Lấy sessions của tenant (FAST với index)
EXPLAIN ANALYZE
SELECT * FROM chat_sessions
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC
LIMIT 20;
-- → Index Scan on idx_sessions_tenant_user_date

-- Query 2: Tìm escalations đang pending (FAST với partial index)
EXPLAIN ANALYZE
SELECT * FROM chat_sessions
WHERE escalation_status = 'pending'
ORDER BY created_at
LIMIT 10;
-- → Index Scan on idx_sessions_escalation_pending
```

---

## 5. Data Types & Constraints

### 5.1 Sử Dụng UUID

Tất cả primary keys sử dụng UUID để:
- Tránh collision khi merge data từ nhiều nguồn
- Bảo mật (không thể đoán được)
- Phân tán tốt hơn trong sharding (future)

```sql
CREATE TABLE example (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

### 5.2 Sử Dụng JSONB

JSONB được dùng cho dữ liệu semi-structured:
- `metadata` trong messages, chat_users
- `config` trong tool_configs
- `capabilities` trong llm_models

**Ưu điểm:**
- Linh hoạt schema
- Hỗ trợ indexing
- Query hiệu quả

```sql
-- Query JSONB
SELECT * FROM messages
WHERE metadata->>'intent' = 'debt_inquiry';

-- Index JSONB field
CREATE INDEX idx_messages_intent
    ON messages ((metadata->>'intent'));
```

### 5.3 Constraints Quan Trọng

```sql
-- Check constraints
CONSTRAINT check_role CHECK (role IN ('admin', 'supporter', 'tenant_user'))
CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'suspended'))

-- Unique constraints
CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
CONSTRAINT unique_provider_model UNIQUE (provider, model_name)

-- Foreign key với ON DELETE actions
REFERENCES tenants(tenant_id) ON DELETE CASCADE
REFERENCES users(user_id) ON DELETE SET NULL
```

---

## 6. Migration Strategy

### 6.1 Sử Dụng Alembic

```bash
# Tạo migration mới
alembic revision --autogenerate -m "Add new table"

# Chạy migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### 6.2 Seed Data

Seed data được lưu trong `migrations/data/`:
- `agents.json` - Agent configs
- `llm_models.json` - LLM definitions
- `base_tools.json` - Tool templates
- `tool_configs.json` - Tool instances
- `tenants.json` - Initial tenants
- `users.json` - Initial users

### 6.3 Backup Strategy

```sql
-- Daily backup
pg_dump chatbot > backup_$(date +%Y%m%d).sql

-- Backup với compression
pg_dump chatbot | gzip > backup_$(date +%Y%m%d).sql.gz

-- Restore
psql chatbot < backup_20250101.sql
```

---

## Tổng Kết

Database schema được thiết kế với:

✅ **Multi-tenancy**: Cách ly dữ liệu nghiêm ngặt
✅ **Scalability**: Indexes tối ưu, JSONB cho flexibility
✅ **Integrity**: Foreign keys, constraints, cascading deletes
✅ **Performance**: Partial indexes, vector indexes
✅ **Security**: Encrypted API keys, UUID PKs
✅ **Extensibility**: JSONB metadata, flexible tool configs

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
