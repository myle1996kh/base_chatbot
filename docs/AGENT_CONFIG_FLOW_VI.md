# Flow Cấu Hình Agent
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025

---

## Mục Lục
1. [Tổng Quan Agent System](#1-tổng-quan-agent-system)
2. [Flow Tạo Agent Mới](#2-flow-tạo-agent-mới)
3. [Flow Cấu Hình Agent](#3-flow-cấu-hình-agent)
4. [Flow Gán Tools Cho Agent](#4-flow-gán-tools-cho-agent)
5. [Flow Phân Quyền Agent Cho Tenant](#5-flow-phân-quyền-agent-cho-tenant)
6. [Flow Supervisor Routing](#6-flow-supervisor-routing)
7. [Flow Domain Agent Execution](#7-flow-domain-agent-execution)

---

## 1. Tổng Quan Agent System

### 1.1 Kiến Trúc Agent

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT SYSTEM                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │         SUPERVISOR AGENT                        │         │
│  │  - Intent Classification                        │         │
│  │  - Agent Routing                                │         │
│  │  - Multi-intent Handling                        │         │
│  └───────────────┬────────────────────────────────┘         │
│                  │                                            │
│                  ▼                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          DOMAIN AGENTS                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │  DebtAgent   │  │ShipmentAgent │  │ Guideline  │ │   │
│  │  │              │  │              │  │   Agent    │ │   │
│  │  │ - Debt info  │  │ - Track order│  │ - Policies │ │   │
│  │  │ - Payment    │  │ - Delivery   │  │ - FAQs     │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │   │
│  │         │                  │                 │        │   │
│  └─────────┼──────────────────┼─────────────────┼────────┘   │
│            │                  │                 │            │
│            ▼                  ▼                 ▼            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TOOL REGISTRY                           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ RAG Tool │  │HTTP Tool │  │Custom    │          │    │
│  │  │          │  │          │  │Tools     │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Các Thành Phần Agent

```
Agent Components:
├── AgentConfig (DB Table)
│   ├── agent_id (UUID)
│   ├── name (unique)
│   ├── prompt_template (Text)
│   ├── llm_model_id (FK)
│   └── is_active (Boolean)
│
├── AgentTools (Junction Table)
│   ├── agent_id (FK)
│   ├── tool_id (FK)
│   └── priority (Integer)
│
├── TenantAgentPermission
│   ├── tenant_id (FK)
│   ├── agent_id (FK)
│   ├── enabled (Boolean)
│   └── output_format_override
│
└── Agent Runtime
    ├── Load configuration
    ├── LLM initialization
    ├── Tool loading
    └── Execution logic
```

---

## 2. Flow Tạo Agent Mới

### 2.1 Sơ Đồ Luồng Tạo Agent

```
┌─────────┐                                           ┌─────────┐
│  Admin  │                                           │ Backend │
└────┬────┘                                           └────┬────┘
     │                                                      │
     │ [1] Admin login vào Admin Dashboard                 │
     │     Navigate to /admin/agents                       │
     │                                                      │
     │ [2] Click "Create New Agent"                        │
     │     Modal/Form hiển thị                             │
     │                                                      │
     │ [3] Điền thông tin Agent:                           │
     │     ┌─────────────────────────────────────┐         │
     │     │ Name: DebtAgent                     │         │
     │     │ Description: Xử lý công nợ          │         │
     │     │ Prompt Template:                    │         │
     │     │   "Bạn là chuyên gia tư vấn..."    │         │
     │     │ LLM Model: GPT-4                    │         │
     │     │ Status: Active                      │         │
     │     └─────────────────────────────────────┘         │
     │                                                      │
     │ [4] Click "Save"                                    │
     │     POST /api/admin/agents                          │
     │     {                                                │
     │       "name": "DebtAgent",                          │
     │       "description": "...",                         │
     │       "prompt_template": "...",                     │
     │       "llm_model_id": "uuid-123",                   │
     │       "is_active": true                             │
     │     }                                                │
     ├─────────────────────────────────────────────────────►
     │                                                      │
     │                        [5] VALIDATION                │
     │                            ├─ Check name unique     │
     │                            ├─ Validate prompt       │
     │                            ├─ Check LLM model exists│
     │                            └─ Validate required fields
     │                                                      │
     │                        [6] CREATE AGENT              │
     │                            INSERT INTO agent_configs │
     │                            (                         │
     │                              agent_id,               │
     │                              name,                   │
     │                              description,            │
     │                              prompt_template,        │
     │                              llm_model_id,           │
     │                              is_active,              │
     │                              created_at              │
     │                            ) VALUES (...)            │
     │                                                      │
     │                        [7] AUTO-ENABLE FOR TENANTS   │
     │                            For each existing tenant: │
     │                            INSERT INTO               │
     │                            tenant_agent_permissions  │
     │                            (                         │
     │                              tenant_id,              │
     │                              agent_id,               │
     │                              enabled = true          │
     │                            )                         │
     │                                                      │
     │                        [8] RELOAD CACHE              │
     │                            Redis: DELETE agents:*    │
     │                            Load new config to cache  │
     │                                                      │
     │ [9] Response                                         │
     │     {                                                │
     │       "agent_id": "uuid-456",                       │
     │       "name": "DebtAgent",                          │
     │       "status": "created",                          │
     │       "message": "Agent created successfully"       │
     │     }                                                │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │ [10] UI Update                                      │
     │      ├─ Close modal                                 │
     │      ├─ Refresh agent list                          │
     │      └─ Show success notification                   │
     │                                                      │
     ▼                                                      │
```

### 2.2 Code Implementation - Tạo Agent

**Frontend:**
```typescript
// frontend/src/pages/admin/AgentManagementPage.tsx
const createAgent = async (agentData: CreateAgentRequest) => {
  try {
    const response = await agentService.createAgent(agentData);

    // Refresh agent list
    await loadAgents();

    // Show success
    toast.success('Agent created successfully!');

    // Close modal
    setShowCreateModal(false);
  } catch (error) {
    toast.error('Failed to create agent: ' + error.message);
  }
};

// frontend/src/services/agentService.ts
export const agentService = {
  createAgent: async (data: CreateAgentRequest): Promise<Agent> => {
    const response = await api.post('/api/admin/agents', data);
    return response.data;
  },

  getAgents: async (): Promise<Agent[]> => {
    const response = await api.get('/api/admin/agents');
    return response.data;
  },

  updateAgent: async (agentId: string, data: UpdateAgentRequest): Promise<Agent> => {
    const response = await api.put(`/api/admin/agents/${agentId}`, data);
    return response.data;
  }
};
```

**Backend:**
```python
# backend/src/api/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.schemas.admin import CreateAgentRequest, AgentResponse
from src.models.agent import AgentConfig
from src.models.tenant import Tenant
from src.models.permissions import TenantAgentPermission
from src.utils.cache import redis_client
import uuid

router = APIRouter()

@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    request: CreateAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Tạo agent mới.

    Steps:
    1. Validate input
    2. Check name uniqueness
    3. Create agent record
    4. Auto-enable for all tenants
    5. Invalidate cache
    """
    # [5] Validation
    # Check name uniqueness
    existing = db.query(AgentConfig).filter_by(name=request.name).first()
    if existing:
        raise HTTPException(400, f"Agent '{request.name}' already exists")

    # Validate LLM model exists
    llm_model = db.query(LLMModel).filter_by(model_id=request.llm_model_id).first()
    if not llm_model:
        raise HTTPException(404, "LLM model not found")

    # [6] Create agent
    agent = AgentConfig(
        agent_id=uuid.uuid4(),
        name=request.name,
        description=request.description,
        prompt_template=request.prompt_template,
        llm_model_id=request.llm_model_id,
        is_active=request.is_active
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    # [7] Auto-enable for all tenants
    tenants = db.query(Tenant).filter_by(status='active').all()
    for tenant in tenants:
        permission = TenantAgentPermission(
            tenant_id=tenant.tenant_id,
            agent_id=agent.agent_id,
            enabled=True  # Auto-enable by default
        )
        db.add(permission)
    db.commit()

    # [8] Reload cache
    redis_client.delete('agents:*')  # Clear all agent caches

    logger.info(
        "agent_created",
        agent_id=str(agent.agent_id),
        agent_name=agent.name,
        created_by=current_user.user_id
    )

    # [9] Return response
    return AgentResponse(
        agent_id=agent.agent_id,
        name=agent.name,
        description=agent.description,
        prompt_template=agent.prompt_template,
        llm_model_id=agent.llm_model_id,
        is_active=agent.is_active,
        created_at=agent.created_at
    )
```

---

## 3. Flow Cấu Hình Agent

### 3.1 Chỉnh Sửa Prompt Template

```
Admin muốn update prompt của DebtAgent
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [1] Admin mở Agent Detail Page                              │
│     GET /api/admin/agents/{agent_id}                        │
│                                                              │
│     Response:                                                │
│     {                                                        │
│       "agent_id": "uuid-456",                               │
│       "name": "DebtAgent",                                  │
│       "prompt_template": "Bạn là chuyên gia...",           │
│       "llm_model_id": "gpt-4-uuid",                         │
│       "tools": [                                             │
│         { "tool_id": "...", "name": "RAG_TOOL", ... },     │
│         { "tool_id": "...", "name": "HTTP_TOOL", ... }     │
│       ]                                                      │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [2] Admin click "Edit Prompt"                               │
│     Rich text editor hiển thị                               │
│                                                              │
│     Prompt Template Editor:                                 │
│     ┌───────────────────────────────────────────────┐      │
│     │ Bạn là chuyên gia tư vấn về công nợ và       │      │
│     │ thanh toán. Nhiệm vụ của bạn là:              │      │
│     │                                                │      │
│     │ 1. Trả lời câu hỏi về số dư tài khoản        │      │
│     │ 2. Hướng dẫn thanh toán                       │      │
│     │ 3. Giải thích chính sách công nợ             │      │
│     │                                                │      │
│     │ Luôn giữ thái độ lịch sự và chuyên nghiệp.   │      │
│     │                                                │      │
│     │ Nếu không có đủ thông tin, hãy hỏi khách     │      │
│     │ hàng cung cấp thêm chi tiết.                  │      │
│     │                                                │      │
│     │ [Variables available:]                         │      │
│     │ - {user_name}                                  │      │
│     │ - {context} (from RAG)                         │      │
│     │ - {tool_results}                               │      │
│     └───────────────────────────────────────────────┘      │
│                                                              │
│     [Preview]  [Test with sample]  [Save]                  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [3] Admin click "Test with sample"                          │
│     Input: "Kiểm tra số dư tài khoản"                       │
│                                                              │
│     System simulates:                                        │
│     ├─ Load agent config                                    │
│     ├─ Apply new prompt                                     │
│     ├─ Call LLM with test input                             │
│     └─ Return sample response                               │
│                                                              │
│     Preview Response:                                        │
│     "Xin chào! Để kiểm tra số dư tài khoản, bạn vui        │
│      lòng cung cấp mã tài khoản hoặc số điện thoại         │
│      đăng ký. Tôi sẽ tra cứu thông tin cho bạn."          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [4] Admin satisfied, click "Save"                           │
│     PUT /api/admin/agents/{agent_id}                        │
│     {                                                        │
│       "prompt_template": "Updated prompt...",              │
│       "llm_model_id": "gpt-4-uuid"  // unchanged           │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                           │
│                                                              │
│ [5] Validate new prompt                                     │
│     ├─ Check not empty                                      │
│     ├─ Check variables valid                                │
│     └─ Check no injection attempts                          │
│                                                              │
│ [6] Update database                                          │
│     UPDATE agent_configs SET                                 │
│       prompt_template = ?,                                   │
│       updated_at = NOW()                                     │
│     WHERE agent_id = ?                                       │
│                                                              │
│ [7] Invalidate cache                                         │
│     Redis: DELETE agents:{agent_id}                          │
│     Redis: DELETE agents:all                                 │
│                                                              │
│ [8] Log change                                               │
│     logger.info(                                             │
│       "agent_updated",                                       │
│       agent_id=agent_id,                                     │
│       changed_fields=["prompt_template"],                    │
│       updated_by=current_user.user_id                        │
│     )                                                        │
│                                                              │
│ [9] Return success                                           │
│     {                                                        │
│       "status": "updated",                                   │
│       "agent_id": "uuid-456",                               │
│       "message": "Agent updated successfully"               │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [10] EFFECT ON RUNTIME                                       │
│                                                              │
│ Next chat request:                                           │
│   ├─ Agent loader checks cache (miss)                       │
│   ├─ Loads from DB (new prompt)                             │
│   ├─ Caches for 1 hour                                      │
│   └─ Uses new prompt for responses                          │
│                                                              │
│ ✅ New prompt active immediately                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Code - Update Agent

```python
# backend/src/api/admin.py
@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    request: UpdateAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update agent configuration."""

    # Get existing agent
    agent = db.query(AgentConfig).filter_by(agent_id=agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    # [5] Validate new prompt
    if request.prompt_template:
        if len(request.prompt_template.strip()) == 0:
            raise HTTPException(400, "Prompt template cannot be empty")

        # Check for SQL injection attempts (basic)
        dangerous_keywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'EXEC']
        prompt_upper = request.prompt_template.upper()
        if any(keyword in prompt_upper for keyword in dangerous_keywords):
            raise HTTPException(400, "Invalid prompt template")

    # Track changed fields
    changed_fields = []

    # [6] Update fields
    if request.name and request.name != agent.name:
        # Check uniqueness
        existing = db.query(AgentConfig).filter_by(name=request.name).first()
        if existing:
            raise HTTPException(400, f"Agent '{request.name}' already exists")
        agent.name = request.name
        changed_fields.append("name")

    if request.description is not None:
        agent.description = request.description
        changed_fields.append("description")

    if request.prompt_template:
        agent.prompt_template = request.prompt_template
        changed_fields.append("prompt_template")

    if request.llm_model_id:
        agent.llm_model_id = request.llm_model_id
        changed_fields.append("llm_model_id")

    if request.is_active is not None:
        agent.is_active = request.is_active
        changed_fields.append("is_active")

    agent.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(agent)

    # [7] Invalidate cache
    redis_client.delete(f'agents:{agent_id}')
    redis_client.delete('agents:all')

    # [8] Log change
    logger.info(
        "agent_updated",
        agent_id=str(agent_id),
        agent_name=agent.name,
        changed_fields=changed_fields,
        updated_by=str(current_user.user_id)
    )

    return AgentResponse.from_orm(agent)
```

---

## 4. Flow Gán Tools Cho Agent

### 4.1 Sơ Đồ Gán Tools

```
Admin muốn gán RAG_TOOL và HTTP_TOOL cho DebtAgent
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [1] Admin mở Agent Tools Configuration                      │
│     Current tools for DebtAgent:                            │
│     ┌───────────────────────────────────────────┐          │
│     │ Tool Name       │ Priority │ Status       │          │
│     ├─────────────────┼──────────┼──────────────┤          │
│     │ (no tools yet)  │          │              │          │
│     └───────────────────────────────────────────┘          │
│                                                              │
│     Available Tools:                                         │
│     ┌───────────────────────────────────────────┐          │
│     │ ☐ RAG_TOOL           (Search knowledge)   │          │
│     │ ☐ HTTP_TOOL          (Call external API)  │          │
│     │ ☐ DEBT_CHECK_TOOL    (Check debt status)  │          │
│     │ ☐ PAYMENT_TOOL       (Process payment)    │          │
│     └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [2] Admin selects tools và sets priority                    │
│     ┌───────────────────────────────────────────┐          │
│     │ ☑ RAG_TOOL           Priority: [1] ▼     │          │
│     │ ☑ HTTP_TOOL          Priority: [2] ▼     │          │
│     │ ☑ DEBT_CHECK_TOOL    Priority: [3] ▼     │          │
│     │ ☐ PAYMENT_TOOL                            │          │
│     └───────────────────────────────────────────┘          │
│                                                              │
│     Priority explanation:                                    │
│     - 1 = Execute first (highest priority)                  │
│     - Lower number = higher priority                        │
│     - Tools execute in order                                │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [3] Admin clicks "Save Tools Configuration"                 │
│     POST /api/admin/agents/{agent_id}/tools                 │
│     {                                                        │
│       "tools": [                                             │
│         {                                                    │
│           "tool_id": "rag-tool-uuid",                       │
│           "priority": 1,                                     │
│           "is_enabled": true                                │
│         },                                                   │
│         {                                                    │
│           "tool_id": "http-tool-uuid",                      │
│           "priority": 2,                                     │
│           "is_enabled": true                                │
│         },                                                   │
│         {                                                    │
│           "tool_id": "debt-check-uuid",                     │
│           "priority": 3,                                     │
│           "is_enabled": true                                │
│         }                                                    │
│       ]                                                      │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                           │
│                                                              │
│ [4] Validate tools                                           │
│     For each tool:                                           │
│       ├─ Check tool exists in tool_configs                  │
│       ├─ Check tool is active                               │
│       ├─ Validate priority (1-100)                          │
│       └─ Check no duplicate priorities                      │
│                                                              │
│ [5] Begin transaction                                        │
│     START TRANSACTION;                                       │
│                                                              │
│ [6] Delete existing tool assignments                        │
│     DELETE FROM agent_tools                                  │
│     WHERE agent_id = 'debt-agent-uuid';                     │
│                                                              │
│ [7] Insert new tool assignments                             │
│     INSERT INTO agent_tools                                  │
│     (agent_id, tool_id, priority, is_enabled)               │
│     VALUES                                                   │
│       ('debt-agent-uuid', 'rag-tool-uuid', 1, true),        │
│       ('debt-agent-uuid', 'http-tool-uuid', 2, true),       │
│       ('debt-agent-uuid', 'debt-check-uuid', 3, true);      │
│                                                              │
│ [8] Commit transaction                                       │
│     COMMIT;                                                  │
│                                                              │
│ [9] Invalidate cache                                         │
│     Redis: DELETE agents:{agent_id}:tools                    │
│     Redis: DELETE agents:{agent_id}                          │
│                                                              │
│ [10] Return success                                          │
│      {                                                       │
│        "status": "updated",                                  │
│        "agent_id": "debt-agent-uuid",                       │
│        "tools_count": 3,                                     │
│        "message": "Tools configured successfully"           │
│      }                                                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [11] RUNTIME EFFECT                                          │
│                                                              │
│ Next time DebtAgent executes:                               │
│                                                              │
│ User: "Kiểm tra số dư tài khoản 12345"                      │
│   ↓                                                          │
│ DebtAgent loads tools:                                      │
│   ├─ Query: SELECT * FROM agent_tools                       │
│   │         WHERE agent_id = ? ORDER BY priority           │
│   └─ Result: [RAG_TOOL, HTTP_TOOL, DEBT_CHECK_TOOL]        │
│                                                              │
│ Execute tools in order:                                     │
│   ├─ [Priority 1] RAG_TOOL                                  │
│   │   └─ Search: "kiểm tra số dư"                          │
│   │   └─ Returns: KB context about balance check           │
│   │                                                          │
│   ├─ [Priority 2] HTTP_TOOL                                 │
│   │   └─ GET /api/accounts/12345/balance                   │
│   │   └─ Returns: { balance: 5000000, currency: "VND" }    │
│   │                                                          │
│   └─ [Priority 3] DEBT_CHECK_TOOL                           │
│       └─ Check if account has debt                          │
│       └─ Returns: { has_debt: false }                       │
│                                                              │
│ Agent synthesizes response:                                 │
│ "Số dư tài khoản 12345 của bạn là 5.000.000 VNĐ.           │
│  Tài khoản không có công nợ."                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Code - Assign Tools

```python
# backend/src/api/admin.py
from pydantic import BaseModel
from typing import List

class ToolAssignment(BaseModel):
    tool_id: UUID
    priority: int
    is_enabled: bool = True

class AssignToolsRequest(BaseModel):
    tools: List[ToolAssignment]

@router.post("/agents/{agent_id}/tools")
async def assign_tools_to_agent(
    agent_id: UUID,
    request: AssignToolsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Assign tools to an agent with priorities.

    Priority:
    - 1 = highest priority (executes first)
    - Lower numbers = higher priority
    - Tools execute in ascending priority order
    """

    # Check agent exists
    agent = db.query(AgentConfig).filter_by(agent_id=agent_id).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    # [4] Validate tools
    tool_ids = [t.tool_id for t in request.tools]
    tools = db.query(ToolConfig).filter(ToolConfig.tool_id.in_(tool_ids)).all()

    if len(tools) != len(tool_ids):
        raise HTTPException(404, "One or more tools not found")

    # Check all tools are active
    inactive_tools = [t.name for t in tools if not t.is_active]
    if inactive_tools:
        raise HTTPException(
            400,
            f"Cannot assign inactive tools: {', '.join(inactive_tools)}"
        )

    # Check priority values
    priorities = [t.priority for t in request.tools]
    if any(p < 1 or p > 100 for p in priorities):
        raise HTTPException(400, "Priority must be between 1 and 100")

    # Check for duplicate priorities
    if len(priorities) != len(set(priorities)):
        raise HTTPException(400, "Duplicate priorities not allowed")

    # [5] Begin transaction
    try:
        # [6] Delete existing assignments
        db.query(AgentTools).filter_by(agent_id=agent_id).delete()

        # [7] Insert new assignments
        for tool_assignment in request.tools:
            agent_tool = AgentTools(
                agent_id=agent_id,
                tool_id=tool_assignment.tool_id,
                priority=tool_assignment.priority,
                is_enabled=tool_assignment.is_enabled
            )
            db.add(agent_tool)

        # [8] Commit
        db.commit()

        # [9] Invalidate cache
        redis_client.delete(f'agents:{agent_id}:tools')
        redis_client.delete(f'agents:{agent_id}')

        logger.info(
            "agent_tools_updated",
            agent_id=str(agent_id),
            tools_count=len(request.tools),
            tool_ids=[str(t.tool_id) for t in request.tools],
            updated_by=str(current_user.user_id)
        )

        # [10] Return success
        return {
            "status": "updated",
            "agent_id": str(agent_id),
            "tools_count": len(request.tools),
            "message": "Tools configured successfully"
        }

    except Exception as e:
        db.rollback()
        logger.error("Failed to assign tools", error=str(e), agent_id=str(agent_id))
        raise HTTPException(500, "Failed to assign tools")
```

---

## 5. Flow Phân Quyền Agent Cho Tenant

### 5.1 Sơ Đồ Phân Quyền

```
Admin muốn enable DebtAgent cho Tenant "Công ty ABC"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [1] Admin navigate to Tenant Management                     │
│     Select tenant: "Công ty ABC"                            │
│     Tab: "Agent Permissions"                                │
│                                                              │
│     Current Agent Permissions:                              │
│     ┌───────────────────────────────────────────┐          │
│     │ Agent       │ Enabled │ Output Format    │          │
│     ├─────────────┼─────────┼──────────────────┤          │
│     │ DebtAgent   │ ☑ Yes   │ Default          │          │
│     │ ShipmentAgent│ ☐ No   │ -                │          │
│     │ GuidelineAgent│☑ Yes  │ Custom Format 1  │          │
│     └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [2] Admin toggles permissions                               │
│     - Enable ShipmentAgent                                  │
│     - Set custom output format for DebtAgent                │
│                                                              │
│     Updated Permissions:                                     │
│     ┌───────────────────────────────────────────┐          │
│     │ Agent       │ Enabled │ Output Format    │          │
│     ├─────────────┼─────────┼──────────────────┤          │
│     │ DebtAgent   │ ☑ Yes   │ JSON Format ▼    │          │
│     │ ShipmentAgent│ ☑ Yes  │ Default          │          │
│     │ GuidelineAgent│☑ Yes  │ Custom Format 1  │          │
│     └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [3] Admin clicks "Save Permissions"                         │
│     PUT /api/admin/tenants/{tenant_id}/permissions          │
│     {                                                        │
│       "agents": [                                            │
│         {                                                    │
│           "agent_id": "debt-agent-uuid",                    │
│           "enabled": true,                                   │
│           "output_format_override": "json-format-uuid"      │
│         },                                                   │
│         {                                                    │
│           "agent_id": "shipment-agent-uuid",                │
│           "enabled": true,                                   │
│           "output_format_override": null                    │
│         },                                                   │
│         {                                                    │
│           "agent_id": "guideline-agent-uuid",               │
│           "enabled": true,                                   │
│           "output_format_override": "custom-format-1-uuid"  │
│         }                                                    │
│       ]                                                      │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                           │
│                                                              │
│ [4] Validate request                                         │
│     ├─ Check tenant exists                                  │
│     ├─ Check all agents exist                               │
│     └─ Check output formats valid                           │
│                                                              │
│ [5] Update permissions (UPSERT)                              │
│     For each agent permission:                              │
│                                                              │
│       INSERT INTO tenant_agent_permissions                   │
│         (tenant_id, agent_id, enabled, output_format_override)
│       VALUES (?, ?, ?, ?)                                    │
│       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET       │
│         enabled = EXCLUDED.enabled,                          │
│         output_format_override = EXCLUDED.output_format_override,
│         updated_at = NOW()                                   │
│                                                              │
│ [6] Invalidate tenant cache                                  │
│     Redis: DELETE tenant:{tenant_id}:agents                  │
│     Redis: DELETE tenant:{tenant_id}:permissions             │
│                                                              │
│ [7] Log changes                                              │
│     logger.info(                                             │
│       "tenant_permissions_updated",                          │
│       tenant_id=tenant_id,                                   │
│       agents_enabled=[...],                                  │
│       updated_by=current_user.user_id                        │
│     )                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [8] RUNTIME EFFECT                                           │
│                                                              │
│ Customer from "Công ty ABC" chats:                          │
│   User: "Tra cứu vận đơn ABC123"                            │
│     ↓                                                        │
│ SupervisorAgent routing:                                    │
│   ├─ Load available agents for tenant                       │
│   │   SELECT ac.* FROM agent_configs ac                     │
│   │   JOIN tenant_agent_permissions tap                     │
│   │     ON ac.agent_id = tap.agent_id                       │
│   │   WHERE tap.tenant_id = 'abc-tenant-id'                 │
│   │     AND tap.enabled = true                              │
│   │     AND ac.is_active = true                             │
│   │                                                          │
│   │   Result: [DebtAgent, ShipmentAgent, GuidelineAgent]    │
│   │                                                          │
│   ├─ LLM classifies intent                                  │
│   │   → ShipmentAgent (vận đơn = shipment)                  │
│   │                                                          │
│   └─ ✅ ShipmentAgent now available!                         │
│                                                              │
│ ShipmentAgent executes:                                     │
│   └─ Check output format override                           │
│       └─ Uses default format (no override for ShipmentAgent)│
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Flow Supervisor Routing

### 6.1 Sơ Đồ Chi Tiết Supervisor

```
User Message: "Kiểm tra đơn hàng ORD123 và số dư tài khoản"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ SUPERVISOR AGENT - INTENT CLASSIFICATION                     │
│                                                              │
│ [1] Load Available Agents for Tenant                        │
│     Query:                                                   │
│       SELECT ac.*                                            │
│       FROM agent_configs ac                                  │
│       JOIN tenant_agent_permissions tap                      │
│         ON ac.agent_id = tap.agent_id                        │
│       WHERE tap.tenant_id = ?                                │
│         AND tap.enabled = true                               │
│         AND ac.is_active = true                              │
│                                                              │
│     Result:                                                  │
│       - DebtAgent (công nợ, số dư)                          │
│       - ShipmentAgent (vận chuyển, đơn hàng)                │
│       - GuidelineAgent (hướng dẫn, chính sách)              │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [2] Build Supervisor Prompt                                 │
│                                                              │
│     System Prompt:                                           │
│     """                                                      │
│     Bạn là supervisor agent. Nhiệm vụ của bạn là phân tích  │
│     ý định của người dùng và route đến agent phù hợp.       │
│                                                              │
│     Available Agents:                                        │
│     1. DebtAgent - Xử lý công nợ, số dư tài khoản          │
│     2. ShipmentAgent - Tra cứu đơn hàng, vận chuyển        │
│     3. GuidelineAgent - Hướng dẫn, chính sách               │
│                                                              │
│     User Message:                                            │
│     "Kiểm tra đơn hàng ORD123 và số dư tài khoản"          │
│                                                              │
│     Classify intent type:                                    │
│     - SINGLE_INTENT: Chỉ 1 agent cần xử lý                  │
│     - MULTI_INTENT: Nhiều agents cần xử lý                  │
│     - UNCLEAR: Không rõ ràng, cần làm rõ                    │
│                                                              │
│     Output JSON format:                                      │
│     {                                                        │
│       "intent_type": "SINGLE_INTENT" | "MULTI_INTENT" |     │
│                      "UNCLEAR",                              │
│       "agents": ["AgentName"],                              │
│       "confidence": 0.0-1.0,                                 │
│       "reasoning": "explanation"                             │
│     }                                                        │
│     """                                                      │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [3] Call LLM for Classification                             │
│     LLM: GPT-4 / Claude / Gemini                            │
│                                                              │
│     LLM Response:                                            │
│     {                                                        │
│       "intent_type": "MULTI_INTENT",                        │
│       "agents": ["ShipmentAgent", "DebtAgent"],             │
│       "confidence": 0.92,                                    │
│       "reasoning": "User asks about both order status       │
│                     (ShipmentAgent) and account balance     │
│                     (DebtAgent). Two separate intents       │
│                     detected."                               │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [4] Route to Domain Agents                                  │
│                                                              │
│ Intent Type: MULTI_INTENT                                   │
│ Agents: [ShipmentAgent, DebtAgent]                          │
│                                                              │
│ Execute in parallel or sequence:                            │
│                                                              │
│ ┌─────────────────────────┐  ┌─────────────────────────┐  │
│ │   ShipmentAgent         │  │   DebtAgent             │  │
│ │   Task: Check ORD123    │  │   Task: Check balance   │  │
│ └───────────┬─────────────┘  └───────────┬─────────────┘  │
│             │                             │                 │
│             ▼                             ▼                 │
│   ┌─────────────────┐           ┌─────────────────┐       │
│   │ Execute tools:  │           │ Execute tools:  │       │
│   │ - HTTP_TOOL     │           │ - RAG_TOOL      │       │
│   │   /orders/ORD123│           │ - HTTP_TOOL     │       │
│   │                 │           │   /accounts/... │       │
│   └────────┬────────┘           └────────┬────────┘       │
│            │                              │                 │
│            ▼                              ▼                 │
│   ┌─────────────────┐           ┌─────────────────┐       │
│   │ Result:         │           │ Result:         │       │
│   │ Order: Shipped  │           │ Balance: 5M VND │       │
│   │ ETA: 2 days     │           │ No debt         │       │
│   └─────────────────┘           └─────────────────┘       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [5] Aggregate Responses                                      │
│                                                              │
│ Combine results from both agents:                          │
│                                                              │
│ Final Response:                                              │
│ """                                                          │
│ Về đơn hàng ORD123:                                         │
│ - Trạng thái: Đã gửi đi                                     │
│ - Dự kiến giao: 2 ngày nữa                                  │
│                                                              │
│ Về số dư tài khoản:                                          │
│ - Số dư hiện tại: 5.000.000 VNĐ                             │
│ - Không có công nợ                                           │
│                                                              │
│ Bạn có cần hỗ trợ thêm gì không?                            │
│ """                                                          │
│                                                              │
│ Metadata:                                                    │
│ {                                                            │
│   "intent": "multi_intent",                                 │
│   "agents_used": ["ShipmentAgent", "DebtAgent"],           │
│   "tools_called": ["HTTP_TOOL", "RAG_TOOL"],               │
│   "total_latency_ms": 2150,                                 │
│   "token_count": 420                                         │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Flow Domain Agent Execution

### 7.1 Sơ Đồ Chi Tiết Execution

```
DebtAgent receives task: "Kiểm tra số dư tài khoản 12345"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ DOMAIN AGENT EXECUTION - DebtAgent                          │
│                                                              │
│ [1] Initialize Agent                                         │
│     ├─ Load agent config from DB/cache                      │
│     ├─ Load assigned tools (priority sorted)                │
│     ├─ Initialize LLM client                                │
│     └─ Load conversation history                            │
│                                                              │
│ Agent Config:                                                │
│ {                                                            │
│   "agent_id": "debt-agent-uuid",                            │
│   "name": "DebtAgent",                                      │
│   "prompt_template": "Bạn là chuyên gia tư vấn...",        │
│   "llm_model": "gpt-4",                                     │
│   "tools": [                                                 │
│     {"name": "RAG_TOOL", "priority": 1},                   │
│     {"name": "HTTP_TOOL", "priority": 2},                  │
│     {"name": "DEBT_CHECK_TOOL", "priority": 3}             │
│   ]                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [2] Entity Extraction                                        │
│                                                              │
│ Use LLM to extract entities from user message:              │
│                                                              │
│ Prompt:                                                      │
│ """                                                          │
│ Extract entities from: "Kiểm tra số dư tài khoản 12345"    │
│                                                              │
│ Expected entities:                                           │
│ - account_number: string                                     │
│ - customer_id: string (optional)                            │
│ - action: string                                             │
│                                                              │
│ Return JSON                                                  │
│ """                                                          │
│                                                              │
│ LLM Response:                                                │
│ {                                                            │
│   "account_number": "12345",                                │
│   "customer_id": null,                                       │
│   "action": "check_balance"                                 │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [3] Tool Execution (Priority Order)                         │
│                                                              │
│ ┌───────────────────────────────────────────┐              │
│ │ TOOL 1: RAG_TOOL (Priority 1)             │              │
│ ├───────────────────────────────────────────┤              │
│ │ Purpose: Search knowledge base            │              │
│ │                                            │              │
│ │ Input:                                     │              │
│ │   query: "kiểm tra số dư tài khoản"       │              │
│ │   tenant_id: "abc-tenant"                 │              │
│ │   top_k: 3                                 │              │
│ │                                            │              │
│ │ Execution:                                 │              │
│ │   1. Generate embedding for query          │              │
│ │   2. Search pgvector:                      │              │
│ │      SELECT content, metadata              │              │
│ │      FROM vector_store                     │              │
│ │      WHERE metadata->>'tenant_id' = ?      │              │
│ │      ORDER BY embedding <=> query_vector   │              │
│ │      LIMIT 3                               │              │
│ │                                            │              │
│ │ Output:                                    │              │
│ │   [                                        │              │
│ │     {                                      │              │
│ │       "content": "Để kiểm tra số dư...",  │              │
│ │       "similarity": 0.89                   │              │
│ │     },                                     │              │
│ │     ...                                    │              │
│ │   ]                                        │              │
│ └───────────────────────────────────────────┘              │
│     ↓                                                        │
│ ┌───────────────────────────────────────────┐              │
│ │ TOOL 2: HTTP_TOOL (Priority 2)            │              │
│ ├───────────────────────────────────────────┤              │
│ │ Purpose: Call external API                │              │
│ │                                            │              │
│ │ Tool Config:                               │              │
│ │   base_url: "https://api.bank.com"        │              │
│ │   endpoint: "/accounts/{account_number}/balance"         │
│ │   method: "GET"                            │              │
│ │   headers:                                 │              │
│ │     Authorization: "Bearer {api_key}"     │              │
│ │                                            │              │
│ │ Execution:                                 │              │
│ │   1. Build URL with extracted entities:    │              │
│ │      https://api.bank.com/accounts/12345/balance         │
│ │                                            │              │
│ │   2. Add auth headers (from tenant config) │              │
│ │                                            │              │
│ │   3. Make HTTP GET request                 │              │
│ │                                            │              │
│ │   4. Parse response                        │              │
│ │                                            │              │
│ │ Output:                                    │              │
│ │   {                                        │              │
│ │     "account_number": "12345",            │              │
│ │     "balance": 5000000,                    │              │
│ │     "currency": "VND",                     │              │
│ │     "last_updated": "2025-12-14T10:00:00Z"│              │
│ │   }                                        │              │
│ └───────────────────────────────────────────┘              │
│     ↓                                                        │
│ ┌───────────────────────────────────────────┐              │
│ │ TOOL 3: DEBT_CHECK_TOOL (Priority 3)      │              │
│ ├───────────────────────────────────────────┤              │
│ │ Purpose: Check debt status                │              │
│ │                                            │              │
│ │ Custom business logic:                     │              │
│ │   - Query internal debt database           │              │
│ │   - Check overdue payments                 │              │
│ │   - Calculate interest                     │              │
│ │                                            │              │
│ │ Output:                                    │              │
│ │   {                                        │              │
│ │     "has_debt": false,                     │              │
│ │     "debt_amount": 0,                      │              │
│ │     "overdue_days": 0                      │              │
│ │   }                                        │              │
│ └───────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [4] Aggregate Tool Results                                  │
│                                                              │
│ tool_results = {                                             │
│   "rag_context": "Để kiểm tra số dư tài khoản...",         │
│   "api_response": {                                          │
│     "balance": 5000000,                                      │
│     "currency": "VND"                                        │
│   },                                                         │
│   "debt_status": {                                           │
│     "has_debt": false                                        │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [5] Generate Final Response with LLM                        │
│                                                              │
│ Build prompt for LLM:                                       │
│ """                                                          │
│ System: {agent.prompt_template}                             │
│                                                              │
│ Context from Knowledge Base:                                 │
│ {tool_results.rag_context}                                  │
│                                                              │
│ Data from API:                                               │
│ - Account: 12345                                             │
│ - Balance: 5,000,000 VND                                     │
│ - Debt status: No debt                                       │
│                                                              │
│ Conversation History:                                        │
│ [Previous 5 messages...]                                     │
│                                                              │
│ User: "Kiểm tra số dư tài khoản 12345"                      │
│                                                              │
│ Assistant (generate response):                               │
│ """                                                          │
│                                                              │
│ LLM Response:                                                │
│ """                                                          │
│ Xin chào! Tôi đã kiểm tra số dư tài khoản 12345 cho bạn:   │
│                                                              │
│ 📊 Số dư hiện tại: 5.000.000 VNĐ                            │
│ ✅ Trạng thái: Không có công nợ                             │
│ 🕐 Cập nhật lúc: 14/12/2025 10:00                           │
│                                                              │
│ Tài khoản của bạn đang hoạt động bình thường. Bạn có cần   │
│ hỗ trợ thêm gì không?                                        │
│ """                                                          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [6] Apply Output Format (if configured)                     │
│                                                              │
│ Check tenant_agent_permissions:                             │
│   output_format_override = null → Use default               │
│                                                              │
│ Default format: Plain text markdown                         │
│                                                              │
│ (If JSON format was configured, response would be:)         │
│ {                                                            │
│   "type": "account_balance",                                │
│   "data": {                                                  │
│     "account": "12345",                                      │
│     "balance": 5000000,                                      │
│     "currency": "VND",                                       │
│     "has_debt": false                                        │
│   },                                                         │
│   "message": "Số dư tài khoản..."                           │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [7] Save to Database                                         │
│                                                              │
│ Save user message:                                           │
│ INSERT INTO messages (                                       │
│   message_id, session_id, role, content, timestamp, metadata│
│ ) VALUES (                                                   │
│   uuid(),                                                    │
│   session_id,                                                │
│   'user',                                                    │
│   'Kiểm tra số dư tài khoản 12345',                         │
│   NOW(),                                                     │
│   '{}'                                                       │
│ );                                                           │
│                                                              │
│ Save assistant response:                                     │
│ INSERT INTO messages (                                       │
│   message_id, session_id, role, content, timestamp, metadata│
│ ) VALUES (                                                   │
│   uuid(),                                                    │
│   session_id,                                                │
│   'assistant',                                               │
│   'Xin chào! Tôi đã kiểm tra...',                          │
│   NOW(),                                                     │
│   '{                                                         │
│     "agent": "DebtAgent",                                    │
│     "intent": "check_balance",                              │
│     "tools_used": ["RAG_TOOL", "HTTP_TOOL", "DEBT_CHECK_TOOL"],
│     "entities": {"account_number": "12345"},                │
│     "latency_ms": 1850,                                      │
│     "token_count": 320                                       │
│   }'                                                         │
│ );                                                           │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [8] Return Response to User                                  │
│                                                              │
│ ChatResponse {                                               │
│   session_id: "session-uuid",                               │
│   agent_name: "DebtAgent",                                  │
│   response: "Xin chào! Tôi đã kiểm tra...",                │
│   status: "success",                                         │
│   metadata: {                                                │
│     tokens: 320,                                             │
│     latency_ms: 1850,                                        │
│     tools_used: ["RAG_TOOL", "HTTP_TOOL", "DEBT_CHECK_TOOL"]│
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Tổng Kết

### Các Flow Chính Đã Mô Tả:

✅ **Flow 2**: Tạo Agent mới - từ UI đến database
✅ **Flow 3**: Cấu hình Agent - chỉnh sửa prompt, LLM model
✅ **Flow 4**: Gán Tools cho Agent - với priority
✅ **Flow 5**: Phân quyền Agent cho Tenant
✅ **Flow 6**: Supervisor routing - intent classification
✅ **Flow 7**: Domain Agent execution - tool execution chi tiết

### Key Points:

1. **Agent config** được cache trong Redis để performance
2. **Tools execute** theo thứ tự priority (1 = highest)
3. **Tenant permissions** kiểm soát agents khả dụng
4. **Multi-intent** được xử lý bởi Supervisor
5. **Output format** có thể override per tenant
6. **All changes** invalidate cache ngay lập tức

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
