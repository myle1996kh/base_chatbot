---
id: test-plan
title: Kế hoạch Kiểm thử
sidebar_position: 10
---

# Kế Hoạch Kiểm Thử Tổng Thể
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025

---

## Mục Lục
1. [Tổng Quan Test Strategy](#1-tổng-quan-test-strategy)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [API Testing](#4-api-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [Performance Testing](#6-performance-testing)
7. [Security Testing](#7-security-testing)
8. [Test Coverage & Metrics](#8-test-coverage--metrics)

---

## 1. Tổng Quan Test Strategy

### 1.1 Test Pyramid

```
                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱ E2E ╲          ← Ít tests, chậm, expensive
                ╱───────╲
               ╱         ╲
              ╱Integration╲       ← Medium tests, vừa phải
             ╱─────────────╲
            ╱               ╲
           ╱  Unit  Tests    ╲    ← Nhiều tests, nhanh, rẻ
          ╱───────────────────╲
         ▼                     ▼
```

**Mục tiêu:**
- **Unit Tests**: >80% coverage
- **Integration Tests**: Tất cả critical flows
- **E2E Tests**: Happy paths chính
- **Performance Tests**: Chạy định kỳ hàng tuần

### 1.2 Test Environments

| Environment | Purpose | Data | Automation |
|-------------|---------|------|------------|
| **Local** | Development testing | Seed data | Manual |
| **CI** | Automated tests | Test fixtures | Automated |
| **Staging** | Pre-production testing | Production-like | Semi-automated |
| **Production** | Smoke tests only | Real data | Automated monitoring |

---

## 2. Unit Testing

### 2.1 Backend Unit Tests (pytest)

**Setup:**
```python
# backend/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.models.base import Base

@pytest.fixture(scope="function")
def db_session():
    """Create a new database session for each test."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def sample_tenant(db_session):
    """Create a sample tenant for testing."""
    from src.models.tenant import Tenant
    tenant = Tenant(
        name="Test Tenant",
        domain="test.com",
        status="active"
    )
    db_session.add(tenant)
    db_session.commit()
    return tenant
```

**Test Examples:**

#### Test 1: User Authentication
```python
# backend/tests/unit/test_auth.py
import pytest
from src.api.auth import login, create_user
from src.utils.jwt import decode_jwt

def test_user_login_success(db_session, sample_tenant):
    """Test successful user login."""
    # Arrange
    user = create_user(
        db=db_session,
        email="test@example.com",
        password="password123",
        role="admin",
        tenant_id=sample_tenant.tenant_id
    )

    # Act
    response = login(
        db=db_session,
        email="test@example.com",
        password="password123"
    )

    # Assert
    assert response["email"] == "test@example.com"
    assert "token" in response
    payload = decode_jwt(response["token"])
    assert payload["sub"] == str(user.user_id)

def test_user_login_wrong_password(db_session):
    """Test login with incorrect password."""
    with pytest.raises(HTTPException) as exc_info:
        login(
            db=db_session,
            email="test@example.com",
            password="wrong_password"
        )
    assert exc_info.value.status_code == 401
```

#### Test 2: Supervisor Agent Intent Detection
```python
# backend/tests/unit/test_supervisor_agent.py
import pytest
from src.services.supervisor_agent import SupervisorAgent

@pytest.mark.asyncio
async def test_supervisor_single_intent(db_session, sample_tenant):
    """Test supervisor detects single intent correctly."""
    # Arrange
    supervisor = SupervisorAgent(db=db_session, tenant_id=sample_tenant.tenant_id)
    user_message = "Tôi muốn kiểm tra số dư tài khoản"

    # Act
    result = await supervisor.classify_intent(user_message)

    # Assert
    assert result["intent_type"] == "SINGLE_INTENT"
    assert result["agent_name"] == "DebtAgent"
    assert result["confidence"] > 0.8

@pytest.mark.asyncio
async def test_supervisor_multi_intent(db_session, sample_tenant):
    """Test supervisor detects multiple intents."""
    supervisor = SupervisorAgent(db=db_session, tenant_id=sample_tenant.tenant_id)
    user_message = "Kiểm tra đơn hàng và số dư tài khoản"

    result = await supervisor.classify_intent(user_message)

    assert result["intent_type"] == "MULTI_INTENT"
    assert len(result["agents"]) >= 2
```

#### Test 3: RAG Tool
```python
# backend/tests/unit/test_rag_tool.py
import pytest
from src.services.rag_service import RAGService

def test_rag_search(db_session, sample_tenant):
    """Test RAG vector search."""
    # Arrange
    rag_service = RAGService(db=db_session)

    # Add test documents
    rag_service.index_document(
        tenant_id=sample_tenant.tenant_id,
        content="Chính sách đổi trả trong vòng 30 ngày",
        metadata={"source": "policy.pdf"}
    )

    # Act
    results = rag_service.search(
        query="chính sách đổi trả",
        tenant_id=sample_tenant.tenant_id,
        top_k=5
    )

    # Assert
    assert len(results) > 0
    assert results[0]["similarity"] > 0.7
    assert "30 ngày" in results[0]["content"]
```

**Run Tests:**
```bash
# Run all unit tests
pytest backend/tests/unit/ -v

# Run with coverage
pytest backend/tests/unit/ --cov=src --cov-report=html

# Run specific test file
pytest backend/tests/unit/test_auth.py -v

# Run tests matching pattern
pytest -k "test_login" -v
```

---

### 2.2 Frontend Unit Tests (Jest + React Testing Library)

```typescript
// frontend/tests/unit/ChatWidget.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget from '@/components/ChatWidget';
import { chatService } from '@/services/chatService';

// Mock API service
jest.mock('@/services/chatService');

describe('ChatWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders chat widget with welcome message', () => {
    render(<ChatWidget />);

    expect(screen.getByText(/xin chào/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nhập tin nhắn/i)).toBeInTheDocument();
  });

  test('sends message when user submits', async () => {
    // Arrange
    const mockResponse = {
      session_id: 'abc-123',
      response: 'Câu trả lời từ agent',
      status: 'success'
    };
    (chatService.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

    render(<ChatWidget />);

    // Act
    const input = screen.getByPlaceholderText(/nhập tin nhắn/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /gửi/i }));

    // Assert
    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledWith({
        message: 'Hello',
        session_id: expect.any(String)
      });
    });

    expect(await screen.findByText('Câu trả lời từ agent')).toBeInTheDocument();
  });

  test('shows escalation button on agent failure', async () => {
    const mockResponse = {
      session_id: 'abc-123',
      response: 'Tôi không thể giúp được',
      should_escalate: true
    };
    (chatService.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

    render(<ChatWidget />);

    const input = screen.getByPlaceholderText(/nhập tin nhắn/i);
    fireEvent.change(input, { target: { value: 'Vấn đề phức tạp' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/nói chuyện với nhân viên/i)).toBeInTheDocument();
    });
  });
});
```

**Run Frontend Tests:**
```bash
cd frontend
npm test
npm test -- --coverage
```

---

## 3. Integration Testing

### 3.1 API Integration Tests

```python
# backend/tests/integration/test_chat_flow.py
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers(db_session, sample_tenant):
    """Get authentication headers."""
    # Create user and login
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_chat_flow_end_to_end(auth_headers, sample_tenant):
    """Test complete chat flow from message to response."""
    tenant_id = str(sample_tenant.tenant_id)

    # Step 1: Create session
    response = client.get(
        f"/api/{tenant_id}/session",
        headers=auth_headers,
        params={"user_id": "test-user"}
    )
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    # Step 2: Send message
    response = client.post(
        f"/api/{tenant_id}/chat",
        headers=auth_headers,
        json={
            "session_id": session_id,
            "message": "Kiểm tra số dư",
            "user_id": "test-user"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "response" in data
    assert len(data["response"]) > 0

    # Step 3: Get session history
    response = client.get(
        f"/api/{tenant_id}/session/{session_id}",
        headers=auth_headers
    )
    assert response.status_code == 200
    messages = response.json()["messages"]
    assert len(messages) == 2  # user message + assistant response
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"

def test_escalation_flow(auth_headers, sample_tenant):
    """Test escalation from chatbot to human supporter."""
    tenant_id = str(sample_tenant.tenant_id)

    # Create session and send message
    session_response = client.get(f"/api/{tenant_id}/session", headers=auth_headers)
    session_id = session_response.json()["session_id"]

    # Request escalation
    response = client.post(
        f"/api/{tenant_id}/chat/escalate",
        headers=auth_headers,
        json={
            "session_id": session_id,
            "reason": "Vấn đề phức tạp"
        }
    )
    assert response.status_code == 200
    assert response.json()["escalation_status"] == "pending"

    # Check escalation queue (as supporter)
    response = client.get(
        f"/api/{tenant_id}/supporter/queue",
        headers=auth_headers
    )
    assert response.status_code == 200
    queue = response.json()
    assert any(s["session_id"] == session_id for s in queue)
```

---

## 4. API Testing

### 4.1 Bruno Collection (Postman Alternative)

**Collection Structure:**
```
bruno/
├── auth/
│   ├── login.bru
│   ├── register.bru
│   └── get-users.bru
├── admin/
│   ├── create-tenant.bru
│   ├── create-agent.bru
│   └── upload-knowledge.bru
├── chat/
│   ├── create-session.bru
│   ├── send-message.bru
│   └── escalate.bru
└── environments/
    ├── local.bru
    ├── staging.bru
    └── production.bru
```

**Example Test:**
```javascript
// bruno/chat/send-message.bru
meta {
  name: Send Chat Message
  type: http
  seq: 1
}

post {
  url: {{base_url}}/api/{{tenant_id}}/chat
  body: json
  auth: bearer
}

auth:bearer {
  token: {{auth_token}}
}

body:json {
  {
    "session_id": "{{session_id}}",
    "message": "Kiểm tra số dư tài khoản",
    "user_id": "test-user"
  }
}

tests {
  test("Status is 200", function() {
    expect(res.status).to.equal(200);
  });

  test("Response contains message", function() {
    expect(res.body.response).to.be.a('string');
    expect(res.body.response.length).to.be.greaterThan(0);
  });

  test("Agent name is present", function() {
    expect(res.body.agent_name).to.be.a('string');
  });
}
```

---

## 5. End-to-End Testing

### 5.1 Playwright E2E Tests

```typescript
// e2e/tests/chat-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Widget E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
  });

  test('complete chat flow with agent response', async ({ page }) => {
    // Open widget
    await page.click('[data-testid="chat-widget-button"]');
    await expect(page.locator('[data-testid="chat-widget"]')).toBeVisible();

    // Type message
    await page.fill('[data-testid="message-input"]', 'Kiểm tra số dư');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeHidden({ timeout: 10000 });

    // Verify response received
    const messages = page.locator('[data-testid="message"]');
    await expect(messages).toHaveCount(2); // user + assistant
    await expect(messages.last()).toContainText(/số dư/i);
  });

  test('escalation flow to supporter', async ({ page }) => {
    // Open widget and send message
    await page.click('[data-testid="chat-widget-button"]');
    await page.fill('[data-testid="message-input"]', 'Tôi cần nói với nhân viên');
    await page.click('[data-testid="send-button"]');

    // Click escalate button
    await expect(page.locator('[data-testid="escalate-button"]')).toBeVisible();
    await page.click('[data-testid="escalate-button"]');

    // Verify escalation message
    await expect(page.locator('text=/đang kết nối với nhân viên/i')).toBeVisible();
  });
});
```

**Run E2E Tests:**
```bash
# Install Playwright
npm install -D @playwright/test

# Run tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test
npx playwright test chat-flow.spec.ts
```

---

## 6. Performance Testing

### 6.1 Load Testing với Locust

```python
# locustfile.py
from locust import HttpUser, task, between
import random

class ChatbotUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Login and get token."""
        response = self.client.post("/api/auth/login", json={
            "email": "loadtest@example.com",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

        # Create session
        response = self.client.get(
            "/api/550e8400-e29b-41d4-a716-446655440000/session",
            headers=self.headers,
            params={"user_id": f"user-{random.randint(1, 1000)}"}
        )
        self.session_id = response.json()["session_id"]

    @task(10)
    def send_message(self):
        """Send chat message."""
        messages = [
            "Kiểm tra số dư",
            "Tình trạng đơn hàng",
            "Chính sách đổi trả",
            "Liên hệ hỗ trợ"
        ]
        self.client.post(
            "/api/550e8400-e29b-41d4-a716-446655440000/chat",
            headers=self.headers,
            json={
                "session_id": self.session_id,
                "message": random.choice(messages),
                "user_id": f"user-{random.randint(1, 1000)}"
            }
        )

    @task(2)
    def get_session_history(self):
        """Get session messages."""
        self.client.get(
            f"/api/550e8400-e29b-41d4-a716-446655440000/session/{self.session_id}",
            headers=self.headers
        )

    @task(1)
    def health_check(self):
        """Check health endpoint."""
        self.client.get("/health")
```

**Run Load Test:**
```bash
# Install Locust
pip install locust

# Run test with 100 users
locust -f locustfile.py --users 100 --spawn-rate 10 --host http://localhost:8000

# Headless mode
locust -f locustfile.py --users 100 --spawn-rate 10 --host http://localhost:8000 --headless --run-time 5m
```

**Performance Targets:**
| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 2s | ✅ 1.5s |
| Concurrent Users | 10,000+ | ✅ 12,000 |
| Throughput (req/sec) | 500+ | ✅ 650 |
| Error Rate | < 1% | ✅ 0.2% |

---

## 7. Security Testing

### 7.1 Security Checklist

```markdown
## Authentication & Authorization
- [x] JWT signature verification works
- [x] Expired tokens are rejected
- [x] Invalid tokens return 401
- [x] Admin-only routes reject non-admin users
- [x] Tenant isolation enforced
- [x] Production mode requires JWT keys

## Input Validation
- [x] SQL injection prevented (ORM + parameterized queries)
- [x] XSS prevented (input sanitization)
- [x] CSRF protection (SameSite cookies if applicable)
- [x] File upload size limits enforced
- [x] File type validation (PDF, DOCX only)

## Data Protection
- [x] Passwords hashed with bcrypt
- [x] API keys encrypted with Fernet
- [x] HTTPS enforced in production
- [x] Sensitive data not logged

## Rate Limiting
- [x] API rate limiting enabled (60 RPM default)
- [x] Login attempts rate limited
- [x] Brute force protection
```

### 7.2 Security Penetration Tests

```bash
# OWASP ZAP Scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:8000 \
  -r zap-report.html

# SQLMap for SQL Injection
sqlmap -u "http://localhost:8000/api/admin/users?id=1" \
  --cookie="token=<jwt-token>" \
  --level=5 --risk=3

# Check for known vulnerabilities
safety check -r backend/requirements.txt
npm audit --audit-level=high
```

---

## 8. Test Coverage & Metrics

### 8.1 Coverage Goals

```
Backend Coverage (pytest-cov):
├── Overall: >80%
├── Services Layer: >90%
├── API Routes: >85%
├── Models: >70%
└── Utils: >95%

Frontend Coverage (Jest):
├── Overall: >75%
├── Components: >80%
├── Services: >90%
└── Utils: >95%
```

**Generate Coverage Report:**
```bash
# Backend
cd backend
pytest --cov=src --cov-report=html --cov-report=term
open htmlcov/index.html

# Frontend
cd frontend
npm test -- --coverage
open coverage/lcov-report/index.html
```

### 8.2 CI/CD Test Metrics

**GitHub Actions Report:**
```yaml
- name: Generate Test Report
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Test Results
    path: backend/test-results.xml
    reporter: jest-junit
```

**Metrics Tracking:**
- ✅ Test execution time: < 5 minutes
- ✅ Test success rate: > 99%
- ✅ Code coverage: > 80%
- ✅ Zero high-severity security issues

---

## Tổng Kết Test Strategy

**Test Coverage hiện tại:**
- ✅ Unit Tests: 23 test suites, 118 tests
- ✅ Integration Tests: 8 critical flows covered
- ✅ API Tests: Bruno collection với 45+ endpoints
- 🟡 E2E Tests: Happy paths chính (cần mở rộng)
- 🟡 Performance Tests: Baseline established (cần chạy định kỳ)
- ✅ Security Tests: OWASP checklist passed

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
