# Tài Liệu Kỹ Thuật - Nền Tảng Chatbot AI

## Mục Lục Tài Liệu

Thư mục này chứa tất cả tài liệu kỹ thuật cho dự án Chatbot AI đa tenant, được viết bằng tiếng Việt.

### 📋 1. Tài Liệu Quản Lý Dự Án

| Tài liệu | Mô tả | File |
|----------|-------|------|
| **PRD** | Tài liệu Yêu cầu Sản phẩm - Mô tả chi tiết các tính năng, mục tiêu kinh doanh, và tiêu chí thành công | [PRD_VI.md](./PRD_VI.md) |
| **User Stories** | Câu chuyện người dùng theo nhóm: Admin, Tenant, Supporter, Customer, Developer | [USER_STORIES_VI.md](./USER_STORIES_VI.md) |

### 🏗️ 2. Tài Liệu Kiến Trúc

| Tài liệu | Mô tả | File |
|----------|-------|------|
| **Architecture** | Sơ đồ kiến trúc tổng quan, layered architecture, backend/frontend structure | [ARCHITECTURE_VI.md](./ARCHITECTURE_VI.md) |
| **Flow Diagrams** | Sơ đồ luồng chi tiết: Login, Chat, Authorization, Escalation, RAG, Tool Execution | [FLOW_DIAGRAMS_VI.md](./FLOW_DIAGRAMS_VI.md) |
| **Data Model** | Mô hình database, ER diagram, indexes, relationships | [DATA_MODEL_VI.md](./DATA_MODEL_VI.md) |

### 🚀 3. Tài Liệu Deployment & Testing

| Tài liệu | Mô tả | File |
|----------|-------|------|
| **Pipeline & CI/CD** | Docker architecture, GitHub Actions, deployment strategies | [PIPELINE_CICD_VI.md](./PIPELINE_CICD_VI.md) |
| **Test Plan** | Kế hoạch kiểm thử tổng thể: Unit, Integration, E2E, Performance, Security tests | [TEST_PLAN_VI.md](./TEST_PLAN_VI.md) |

### 🔍 4. Tài Liệu Code Quality

| Tài liệu | Mô tả | File |
|----------|-------|------|
| **Code Review & Improvement** | Đánh giá code, điểm mạnh/yếu, kế hoạch cải thiện, best practices | [CODE_REVIEW_IMPROVEMENT_VI.md](./CODE_REVIEW_IMPROVEMENT_VI.md) |

---

## Tài Liệu Tiếng Anh (English Docs)

Thư mục [../document-project/](../document-project/) chứa tài liệu tiếng Anh chi tiết:

- `architecture-backend.md` - Backend architecture
- `architecture-frontend.md` - Frontend architecture
- `data-models-backend.md` - Database models
- `api-contracts-backend.md` - API specifications
- `BACKEND_SETUP.md` - Setup guide
- `CONFIGURATION.md` - Configuration guide
- `JWT_SETUP_GUIDE.md` - JWT setup
- `TENANT_SETUP_GUIDE.md` - Tenant setup
- And more...

---

## Cách Sử Dụng Tài Liệu

### Cho Developer Mới

1. **Bắt đầu với:** [PRD_VI.md](./PRD_VI.md) - Hiểu tổng quan sản phẩm
2. **Tiếp theo:** [ARCHITECTURE_VI.md](./ARCHITECTURE_VI.md) - Nắm kiến trúc hệ thống
3. **Sau đó:** [FLOW_DIAGRAMS_VI.md](./FLOW_DIAGRAMS_VI.md) - Hiểu các luồng chính
4. **Cuối cùng:** [DATA_MODEL_VI.md](./DATA_MODEL_VI.md) - Học database schema

### Cho QA/Tester

1. **Đọc:** [TEST_PLAN_VI.md](./TEST_PLAN_VI.md) - Kế hoạch kiểm thử
2. **Tham khảo:** [USER_STORIES_VI.md](./USER_STORIES_VI.md) - Test scenarios
3. **Kiểm tra:** [FLOW_DIAGRAMS_VI.md](./FLOW_DIAGRAMS_VI.md) - Validation flows

### Cho DevOps Engineer

1. **Bắt đầu:** [PIPELINE_CICD_VI.md](./PIPELINE_CICD_VI.md) - Deployment setup
2. **Tham khảo:** [ARCHITECTURE_VI.md](./ARCHITECTURE_VI.md) - Infrastructure requirements
3. **Cấu hình:** `../document-project/CONFIGURATION.md` - Environment variables

### Cho Technical Lead

1. **Review:** [CODE_REVIEW_IMPROVEMENT_VI.md](./CODE_REVIEW_IMPROVEMENT_VI.md)
2. **Plan:** Roadmap cải thiện trong 3 tháng
3. **Monitor:** Test coverage và code quality metrics

---

## Cấu Trúc Dự Án

```
base_chatbot/
├── backend/                    # Python FastAPI backend
│   ├── src/
│   │   ├── api/               # API routes
│   │   ├── services/          # Business logic
│   │   ├── models/            # Database models
│   │   └── ...
│   └── tests/                 # Backend tests
│
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   ├── services/          # API clients
│   │   └── ...
│   └── tests/                 # Frontend tests
│
├── docs/                       # 📚 TÀI LIỆU TIẾNG VIỆT (bạn đang ở đây)
│   ├── PRD_VI.md
│   ├── USER_STORIES_VI.md
│   ├── ARCHITECTURE_VI.md
│   ├── FLOW_DIAGRAMS_VI.md
│   ├── DATA_MODEL_VI.md
│   ├── PIPELINE_CICD_VI.md
│   ├── TEST_PLAN_VI.md
│   ├── CODE_REVIEW_IMPROVEMENT_VI.md
│   └── README.md              # File này
│
├── document-project/           # English documentation
│   ├── architecture-backend.md
│   ├── api-contracts-backend.md
│   └── ...
│
├── docker-compose.yml          # Development environment
├── Dockerfile                  # Production build
└── README.md                   # Project README
```

---

## Quick Links

### Tài Liệu Kỹ Thuật Chính
- [PRD - Product Requirements](./PRD_VI.md)
- [Architecture Overview](./ARCHITECTURE_VI.md)
- [Flow Diagrams](./FLOW_DIAGRAMS_VI.md)
- [Data Model](./DATA_MODEL_VI.md)

### Hướng Dẫn Setup
- [Backend Setup](../document-project/BACKEND_SETUP.md) (English)
- [Configuration Guide](../document-project/CONFIGURATION.md) (English)
- [Tenant Setup](../document-project/TENANT_SETUP_GUIDE.md) (English)

### Testing & Quality
- [Test Plan](./TEST_PLAN_VI.md)
- [Code Review](./CODE_REVIEW_IMPROVEMENT_VI.md)

### Deployment
- [Pipeline & CI/CD](./PIPELINE_CICD_VI.md)

---

## Cập Nhật Tài Liệu

**Nguyên tắc:**
- ✅ Luôn cập nhật docs khi thay đổi code
- ✅ Sử dụng Markdown chuẩn
- ✅ Thêm sơ đồ ASCII art khi cần
- ✅ Bao gồm code examples
- ✅ Review docs như review code

**Quy trình:**
1. Thay đổi code
2. Cập nhật tài liệu liên quan
3. Commit code + docs cùng lúc
4. PR review bao gồm cả docs

---

## Liên Hệ & Support

**Questions?**
- 📧 Email: dev-team@example.com
- 💬 Slack: #chatbot-dev
- 📝 Issues: GitHub Issues

**Contribution:**
- Fork repository
- Create feature branch
- Update docs
- Submit PR

---

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025
**Ngôn ngữ:** Tiếng Việt
**Status:** ✅ Complete
