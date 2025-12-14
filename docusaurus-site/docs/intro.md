---
sidebar_position: 1
id: intro
title: Giới thiệu
slug: /
---

# Tài Liệu Kỹ Thuật - Nền Tảng Chatbot AI

Chào mừng bạn đến với tài liệu kỹ thuật của **Nền tảng Chatbot AI đa tenant**.

## 🎯 Tổng Quan

Đây là một nền tảng chatbot AI enterprise-grade với các tính năng:

- ✅ **Multi-tenant architecture** - Hỗ trợ nhiều tổ chức độc lập
- ✅ **AI Agent Orchestration** - Supervisor + Domain agents
- ✅ **RAG System** - Knowledge base với pgvector
- ✅ **Human Escalation** - Chuyển tiếp sang nhân viên hỗ trợ
- ✅ **Admin Dashboard** - Quản lý toàn diện
- ✅ **Embeddable Widget** - Nhúng vào website

## 📚 Cấu Trúc Tài Liệu

### 📋 Quản lý Dự án
- **[PRD](/prd)** - Tài liệu Yêu cầu Sản phẩm
- **[User Stories](/user-stories)** - 28 user stories theo nhóm người dùng

### 🏗️ Kiến trúc
- **[Architecture](/architecture)** - Kiến trúc tổng quan
- **[Data Model](/data-model)** - Database schema (15+ bảng)
- **[Flow Diagrams](/flow-diagrams)** - Sơ đồ luồng chi tiết

### 🤖 Agent & RAG
- **[Agent Config Flow](/agent-config-flow)** - Cấu hình agents
- **[RAG Flow](/rag-flow)** - Hệ thống RAG chi tiết

### 🚀 Deployment
- **[Pipeline CI/CD](/pipeline-cicd)** - Docker & GitHub Actions
- **[Test Plan](/test-plan)** - Chiến lược kiểm thử

### 🔍 Code Quality
- **[Code Review](/code-review-improvement)** - Đánh giá & cải thiện

## 🚀 Quick Start

### Yêu cầu hệ thống
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (with pgvector)
- Redis 7+

### Cài đặt nhanh

\`\`\`bash
# Clone repository
git clone https://github.com/your-org/chatbot.git
cd chatbot

# Start với Docker Compose
docker-compose up -d

# Truy cập
# - API: http://localhost:8000
# - Docs: http://localhost:8000/docs
# - Admin: http://localhost:8000/admin
\`\`\`

## 🎨 Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Python 3.11, FastAPI |
| **Frontend** | React 18, TypeScript, Vite |
| **Database** | PostgreSQL 15 + pgvector |
| **Cache** | Redis 7 |
| **AI Framework** | LangChain, LangGraph |
| **LLM** | OpenAI, Anthropic, OpenRouter |
| **Deployment** | Docker, Gunicorn |

## 📖 Hướng Dẫn Sử Dụng

### Cho Developer Mới

1. **Bắt đầu:** Đọc [PRD](/prd) để hiểu tổng quan
2. **Kiến trúc:** Xem [Architecture](/architecture)
3. **Luồng:** Học [Flow Diagrams](/flow-diagrams)
4. **Database:** Tìm hiểu [Data Model](/data-model)
5. **Setup:** Làm theo [Backend Setup](../document-project/BACKEND_SETUP.md)

### Cho QA/Tester

1. Đọc [Test Plan](/test-plan)
2. Tham khảo [User Stories](/user-stories)
3. Kiểm tra [Flow Diagrams](/flow-diagrams)

### Cho DevOps

1. Xem [Pipeline CI/CD](/pipeline-cicd)
2. Cấu hình environment variables
3. Setup monitoring & logging

## 🤝 Đóng Góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📧 Liên Hệ

- **Email:** dev-team@example.com
- **Slack:** #chatbot-dev
- **GitHub Issues:** [Link](https://github.com/your-org/chatbot/issues)

## 📄 License

MIT License - Xem file [LICENSE](../LICENSE) để biết thêm chi tiết.

---

**Phiên bản:** 1.0.0
**Cập nhật:** Tháng 12/2025
**Trạng thái:** ✅ Production Ready
