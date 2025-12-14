---
id: prd
title: PRD - Yêu cầu Sản phẩm
sidebar_position: 2
---

# Tài Liệu Yêu Cầu Sản Phẩm (PRD)
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025
**Trạng thái:** Sẵn sàng Production
**Chủ sở hữu sản phẩm:** Nhóm Phát triển

---

## 1. Tổng Quan Dự Án

### 1.1 Tầm Nhìn Sản Phẩm
Xây dựng nền tảng chatbot AI đa tenant cấp doanh nghiệp toàn diện, cho phép các tổ chức triển khai các agent hội thoại thông minh với khả năng RAG (Retrieval-Augmented Generation) tiên tiến, quy trình chuyển tiếp sang nhân viên hỗ trợ, và quyền kiểm soát tùy chỉnh đầy đủ.

### 1.2 Mục Tiêu Kinh Doanh
- **Hỗ trợ đa tenant**: Hỗ trợ nhiều tổ chức độc lập trên một nền tảng với cách ly dữ liệu nghiêm ngặt
- **Giảm khối lượng công việc hỗ trợ**: Tự động hóa 70-80% các câu hỏi thường gặp của khách hàng thông qua AI agents
- **Cải thiện sự hài lòng của khách hàng**: Cung cấp phản hồi tức thì, chính xác 24/7 với tùy chọn chuyển sang nhân viên
- **Đảm bảo khả năng mở rộng**: Xử lý hàng nghìn cuộc hội thoại đồng thời trên nhiều tenant
- **Duy trì bảo mật**: Xác thực, phân quyền và bảo vệ dữ liệu cấp doanh nghiệp

### 1.3 Chỉ Số Thành Công
| Chỉ số | Mục tiêu | Trạng thái hiện tại |
|--------|----------|---------------------|
| Tỷ lệ Tự động hóa Agent | 75% | ✅ Đạt được |
| Thời gian Phản hồi TB | < 2 giây | ✅ Đạt được |
| Thời gian Giải quyết Escalation | < 5 phút | 🟡 Đang triển khai |
| Uptime Hệ thống | 99.9% | ✅ Đạt được |
| Phiên đồng thời | 10,000+ | ✅ Hỗ trợ |
| Cách ly Multi-tenant | 100% | ✅ Đạt được |

---

## 2. Người Dùng Mục Tiêu

### 2.1 Nhóm Người Dùng Chính

#### **Persona 1: Quản Trị Viên Doanh Nghiệp**
- **Vai trò:** Quản trị viên hệ thống
- **Mục tiêu:** Cấu hình agents, quản lý người dùng, giám sát tình trạng hệ thống
- **Điểm đau:** Thiết lập phức tạp, thiếu khả năng hiển thị, thách thức tích hợp
- **Tính năng cần thiết:** Bảng điều khiển quản trị, quản lý tenant, phân tích

#### **Persona 2: Nhân Viên Hỗ Trợ (Supporter)**
- **Vai trò:** Đại diện Hỗ trợ Khách hàng
- **Mục tiêu:** Xử lý các cuộc hội thoại được chuyển tiếp, duy trì chất lượng dịch vụ
- **Điểm đau:** Chuyển đổi ngữ cảnh, thời gian phản hồi chậm
- **Tính năng cần thiết:** Hàng đợi escalation, tiếp quản chat trực tiếp, lịch sử hội thoại

#### **Persona 3: Người Dùng Tenant (Nội bộ)**
- **Vai trò:** Nhân viên Tổ chức
- **Mục tiêu:** Cấu hình chatbot cho tổ chức của họ
- **Điểm đau:** Tùy chỉnh hạn chế, độ phức tạp kỹ thuật
- **Tính năng cần thiết:** Tải lên knowledge base, cấu hình agent, tùy chỉnh widget

#### **Persona 4: Khách Hàng Cuối (Chat User)**
- **Vai trò:** Khách hàng Bên ngoài
- **Mục tiêu:** Nhận câu trả lời nhanh chóng, chính xác cho các câu hỏi
- **Điểm đau:** Thời gian chờ lâu, phản hồi không liên quan, không có tùy chọn nhân viên
- **Tính năng cần thiết:** Giao diện chat đơn giản, phản hồi tức thì, nút escalation

---

## 3. Tính Năng & Yêu Cầu Sản Phẩm

### 3.1 Tính Năng Cốt Lõi

#### **Tính năng 1: Kiến Trúc Đa Tenant**
**Ưu tiên:** P0 (Quan trọng)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-1.1: Mỗi tenant phải có cách ly dữ liệu hoàn toàn
- FR-1.2: Tenants có thể cấu hình các mô hình LLM và API keys độc lập
- FR-1.3: Quyền agent và tool cụ thể cho từng tenant
- FR-1.4: Knowledge base riêng biệt cho mỗi tenant
- FR-1.5: Branding tùy chỉnh và cấu hình widget cho mỗi tenant

**Tiêu chí Chấp nhận:**
- ✅ Tenant A không thể truy cập dữ liệu của Tenant B qua bất kỳ API endpoint nào
- ✅ Cấu hình cụ thể của tenant ghi đè cấu hình mặc định của hệ thống
- ✅ Truy vấn database tự động lọc theo tenant_id
- ✅ Admin có thể tạo/sửa/xóa tenants

---

#### **Tính năng 2: Điều Phối Agent Thông Minh**
**Ưu tiên:** P0 (Quan trọng)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-2.1: Supervisor agent định tuyến ý định người dùng đến các domain agent phù hợp
- FR-2.2: Hỗ trợ phát hiện ý định đơn, đa ý định và ý định không rõ ràng
- FR-2.3: Domain agents chuyên biệt cho các ngữ cảnh kinh doanh cụ thể (Nợ, Vận chuyển, Hướng dẫn, v.v.)
- FR-2.4: Lựa chọn tool động dựa trên cấu hình agent
- FR-2.5: Prompts và mô hình LLM có thể cấu hình cho mỗi agent

**Tiêu chí Chấp nhận:**
- ✅ Tin nhắn người dùng được định tuyến chính xác đến agent phù hợp >95% độ chính xác
- ✅ Tin nhắn đa ý định được tách và xử lý bởi nhiều agents
- ✅ Ý định không rõ ràng trả về yêu cầu làm rõ
- ✅ Admin có thể tạo agents mới mà không cần thay đổi code

---

#### **Tính năng 3: RAG (Retrieval-Augmented Generation)**
**Ưu tiên:** P0 (Quan trọng)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-3.1: Hỗ trợ tải lên tài liệu (PDF, DOCX)
- FR-3.2: Trích xuất văn bản và chia nhỏ tự động
- FR-3.3: Tạo vector embedding (384 chiều)
- FR-3.4: Tìm kiếm độ tương đồng sử dụng pgvector
- FR-3.5: Cách ly knowledge base đa tenant
- FR-3.6: Theo dõi metadata tài liệu (nguồn, created_at, tenant_id)

**Tiêu chí Chấp nhận:**
- ✅ Tài liệu được xử lý và lưu trữ thành công trong vector database
- ✅ Nội dung liên quan được truy xuất dựa trên truy vấn người dùng (>80% độ liên quan)
- ✅ Kết quả tìm kiếm được lọc theo tenant_id
- ✅ Hỗ trợ tài liệu lên đến 100MB

---

#### **Tính năng 4: Quy Trình Escalation Sang Nhân Viên**
**Ưu tiên:** P0 (Quan trọng)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-4.1: Người dùng có thể yêu cầu escalation sang nhân viên hỗ trợ
- FR-4.2: Escalation tự động dựa trên từ khóa hoặc khi agent không thể xử lý
- FR-4.3: Hàng đợi escalation cho nhân viên hỗ trợ
- FR-4.4: Chuyển giao chat thời gian thực từ agent sang supporter
- FR-4.5: Lịch sử hội thoại được bảo toàn trong quá trình escalation
- FR-4.6: Theo dõi trạng thái escalation (pending, assigned, resolved)

**Tiêu chí Chấp nhận:**
- ✅ Yêu cầu escalation tạo ticket hỗ trợ
- ✅ Nhân viên hỗ trợ được thông báo theo thời gian thực
- ✅ Supporter có thể tham gia cuộc hội thoại và chat với khách hàng
- ✅ Lịch sử tin nhắn đầy đủ có sẵn cho supporter
- ✅ Trạng thái phiên được cập nhật thành "escalated"

---

#### **Tính năng 5: Xác Thực & Phân Quyền**
**Ưu tiên:** P0 (Quan trọng)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-5.1: Xác thực dựa trên JWT (RS256)
- FR-5.2: Kiểm soát truy cập dựa trên vai trò (Admin, Supporter, Tenant User, Chat User)
- FR-5.3: Hash mật khẩu an toàn (bcrypt)
- FR-5.4: Mã hóa API key (Fernet)
- FR-5.5: Truy cập API dựa trên token
- FR-5.6: Xác thực bảo mật production (không bỏ qua auth, yêu cầu JWT keys)

**Tiêu chí Chấp nhận:**
- ✅ Tất cả API endpoints yêu cầu JWT token hợp lệ (trừ routes công khai)
- ✅ Routes chỉ dành cho admin từ chối người dùng không phải admin
- ✅ Cách ly tenant được thực thi trong middleware
- ✅ Khởi động thất bại nếu không đáp ứng yêu cầu bảo mật trong production

---

#### **Tính năng 6: Hệ Thống Tool Linh Hoạt**
**Ưu tiên:** P1 (Cao)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-6.1: Hỗ trợ nhiều loại tool (HTTP, RAG, Custom)
- FR-6.2: Tải tool động dựa trên cấu hình agent
- FR-6.3: Quản lý quyền tool cho mỗi tenant
- FR-6.4: Xác thực JSON schema cho đầu vào tool
- FR-6.5: Trích xuất entity từ tin nhắn người dùng cho tham số tool
- FR-6.6: Lựa chọn tool dựa trên mức độ ưu tiên

**Tiêu chí Chấp nhận:**
- ✅ Tools có thể được thêm/xóa mà không cần triển khai code
- ✅ Đầu vào tool không hợp lệ bị từ chối với thông báo lỗi rõ ràng
- ✅ Agent thực thi tools theo thứ tự ưu tiên
- ✅ Phản hồi của tool được tích hợp vào phản hồi của agent

---

#### **Tính năng 7: Bảng Điều Khiển Quản Trị**
**Ưu tiên:** P1 (Cao)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-7.1: Quản lý tenant (tạo, sửa, xóa, cấu hình quyền)
- FR-7.2: Quản lý người dùng (thêm người dùng, gán vai trò)
- FR-7.3: Cấu hình agent (tạo agents, đặt prompts, gán tools)
- FR-7.4: Quản lý tool (định nghĩa tools, cấu hình endpoints)
- FR-7.5: Tải lên và tìm kiếm knowledge base
- FR-7.6: Giám sát phiên và phân tích
- FR-7.7: Quản lý hàng đợi escalation
- FR-7.8: Cấu hình widget (branding, màu sắc, vị trí)

**Tiêu chí Chấp nhận:**
- ✅ Tất cả chức năng admin có thể truy cập qua UI
- ✅ Cập nhật cấu hình theo thời gian thực được phản ánh ngay lập tức
- ✅ Thiết kế responsive cho desktop/tablet
- ✅ Xác thực đầu vào ngăn chặn cấu hình không hợp lệ

---

#### **Tính năng 8: Widget Chat Nhúng**
**Ưu tiên:** P1 (Cao)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-8.1: Widget JavaScript nhẹ để nhúng
- FR-8.2: Giao diện tùy chỉnh (màu sắc, vị trí, branding)
- FR-8.3: Thiết kế responsive (mobile, tablet, desktop)
- FR-8.4: Hỗ trợ Markdown cho định dạng phong phú
- FR-8.5: Chỉ báo đang gõ và trạng thái tải
- FR-8.6: Duy trì lịch sử hội thoại
- FR-8.7: Nút escalation trong widget

**Tiêu chí Chấp nhận:**
- ✅ Widget tải trong \<500ms
- ✅ Widget thích ứng với kích thước màn hình
- ✅ Branding khớp với cấu hình tenant
- ✅ Tin nhắn render markdown chính xác

---

#### **Tính năng 9: Nhắn Tin Thời Gian Thực**
**Ưu tiên:** P1 (Cao)
**Trạng thái:** ✅ Đã triển khai

**Yêu cầu:**
- FR-9.1: Server-Sent Events (SSE) để streaming phản hồi
- FR-9.2: Cập nhật chat trực tiếp cho cuộc hội thoại supporter
- FR-9.3: Chỉ báo đang gõ
- FR-9.4: Giám sát trạng thái kết nối

**Tiêu chí Chấp nhận:**
- ✅ Phản hồi agent được stream khi chúng được tạo
- ✅ Tin nhắn supporter xuất hiện ngay lập tức trong widget khách hàng
- ✅ Lỗi kết nối được xử lý gracefully với reconnection

---

### 3.2 Yêu Cầu Phi Chức Năng

#### **Hiệu Năng**
- NFR-1: Thời gian phản hồi API < 2 giây (p95)
- NFR-2: Hỗ trợ 10,000+ phiên đồng thời
- NFR-3: Truy vấn database được tối ưu hóa với indexes phù hợp
- NFR-4: Redis caching cho dữ liệu truy cập thường xuyên
- NFR-5: Connection pooling cho database (pool size: 20)

#### **Bảo Mật**
- NFR-6: Bắt buộc HTTPS trong production
- NFR-7: JWT tokens với thời hạn 24 giờ
- NFR-8: API keys được mã hóa khi lưu trữ
- NFR-9: Xác thực đầu vào trên tất cả endpoints
- NFR-10: Rate limiting (mặc định 60 RPM)
- NFR-11: CORS được cấu hình đúng
- NFR-12: Phòng chống SQL injection qua ORM

#### **Khả Năng Mở Rộng**
- NFR-13: Hỗ trợ horizontal scaling (API stateless)
- NFR-14: Database read replicas cho analytics
- NFR-15: Redis cho distributed caching
- NFR-16: Xử lý tác vụ bất đồng bộ

#### **Độ Tin Cậy**
- NFR-17: SLA uptime 99.9%
- NFR-18: Health check endpoints cho giám sát
- NFR-19: Structured logging cho debugging
- NFR-20: Backup database mỗi 6 giờ
- NFR-21: Xử lý lỗi graceful với thông báo thân thiện

#### **Khả Năng Quan Sát**
- NFR-22: Structured logging (structlog)
- NFR-23: Logging request/response với unique IDs
- NFR-24: Logging sự kiện bảo mật
- NFR-25: Theo dõi metrics hiệu năng

---

## 4. Yêu Cầu Kỹ Thuật

### 4.1 Kiến Trúc Hệ Thống
- **Backend:** Python 3.11+, FastAPI, LangChain, LangGraph
- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS
- **Database:** PostgreSQL 15+ với pgvector extension
- **Cache:** Redis 7.x
- **Deployment:** Docker, Docker Compose, Gunicorn
- **Reverse Proxy:** Nginx (tùy chọn cho production)

### 4.2 Yêu Cầu Tích Hợp
- **LLM Providers:** OpenAI, Anthropic, Google GenAI, OpenRouter
- **Vector Database:** pgvector cho embeddings
- **Embedding Model:** sentence-transformers (all-MiniLM-L6-v2)
- **Xử lý Tài liệu:** pypdf, python-docx

### 4.3 Yêu Cầu Dữ Liệu
- **Database Schema:** 15+ bảng với các mối quan hệ phù hợp
- **Migrations:** Alembic cho versioning schema
- **Seed Data:** Agents, tools, LLM models, tenants ban đầu
- **Backups:** Backup tự động hàng ngày với lưu trữ 30 ngày

---

## 5. Luồng Người Dùng

### 5.1 Luồng Chat Khách Hàng Cuối
1. Khách hàng truy cập website với widget nhúng
2. Widget tải và tạo/lấy phiên
3. Khách hàng gõ tin nhắn
4. Tin nhắn được gửi đến API với ngữ cảnh phiên
5. Supervisor agent xác định ý định
6. Domain agent xử lý với tools (RAG, HTTP, v.v.)
7. Phản hồi được stream về widget
8. Nếu không hài lòng, khách hàng yêu cầu escalation
9. Nhân viên hỗ trợ tham gia cuộc hội thoại

### 5.2 Luồng Cấu Hình Admin
1. Admin đăng nhập với thông tin đăng nhập
2. Dashboard hiển thị danh sách tenant
3. Admin tạo tenant mới
4. Cấu hình agents cho tenant
5. Tải lên tài liệu knowledge base
6. Gán tools cho agents
7. Tùy chỉnh giao diện widget
8. Kiểm tra widget trước khi triển khai

### 5.3 Luồng Escalation Nhân Viên Hỗ Trợ
1. Supporter đăng nhập vào bảng điều khiển hỗ trợ
2. Xem hàng đợi escalation
3. Chấp nhận phiên được escalate
4. Xem lại lịch sử hội thoại
5. Tham gia chat trực tiếp với khách hàng
6. Giải quyết vấn đề
7. Đánh dấu phiên là đã giải quyết

---

## 6. Ngoài Phạm Vi (Cân Nhắc Tương Lai)

Các tính năng sau KHÔNG được bao gồm trong phiên bản hiện tại nhưng có thể được xem xét cho các bản phát hành trong tương lai:

- ❌ Ứng dụng mobile native (iOS, Android)
- ❌ Hỗ trợ chat giọng nói/âm thanh
- ❌ Tích hợp video call
- ❌ Bảng điều khiển phân tích nâng cao với biểu đồ
- ❌ A/B testing cho agent prompts
- ❌ Hỗ trợ đa ngôn ngữ (i18n)
- ❌ Theo dõi phân tích cảm xúc
- ❌ Integration marketplace (Slack, Zendesk, Salesforce)
- ❌ Thông báo webhook tùy chỉnh
- ❌ Chương trình reseller white-label

---

## 7. Phụ Thuộc & Giả Định

### 7.1 Phụ Thuộc Bên Ngoài
- Kết nối internet ổn định cho các cuộc gọi LLM API
- Tính khả dụng của OpenAI/Anthropic/OpenRouter API
- PostgreSQL database server
- Redis cache server

### 7.2 Giả Định
- Tenants cung cấp API keys LLM của riêng họ hoặc sử dụng mặc định của nền tảng
- Nhân viên hỗ trợ có sẵn trong giờ làm việc cho escalations
- Tài liệu tải lên ở định dạng được hỗ trợ (PDF, DOCX)
- Độ dài hội thoại trung bình < 50 tin nhắn

---

## 8. Rủi Ro & Giảm Thiểu

| Rủi ro | Tác động | Xác suất | Giảm thiểu |
|---------|----------|----------|------------|
| LLM API downtime | Cao | Trung bình | Triển khai fallback providers, cache responses |
| Suy giảm hiệu năng database | Cao | Thấp | Tối ưu queries, thêm indexes, triển khai read replicas |
| Vi phạm bảo mật | Nghiêm trọng | Thấp | Kiểm tra bảo mật thường xuyên, penetration testing |
| Mở rộng nhanh vượt khả năng | Trung bình | Trung bình | Auto-scaling infrastructure, load testing |
| Phản hồi agent không chính xác | Cao | Trung bình | Hàng đợi xem xét nhân viên, vòng phản hồi, tinh chỉnh prompt |

---

## 9. Kế Hoạch Phát Hành

### Giai đoạn 1: Hiện tại (v1.0) ✅ Hoàn thành
- ✅ Kiến trúc đa tenant
- ✅ Điều phối agent
- ✅ Hệ thống RAG
- ✅ Human escalation
- ✅ Bảng điều khiển admin
- ✅ Chat widget

### Giai đoạn 2: Cải tiến (v1.1) 🟡 Đã lên kế hoạch
- 🔄 Bảng điều khiển phân tích nâng cao
- 🔄 Thông báo webhook
- 🔄 Tăng cường độ bao phủ kiểm thử
- 🔄 Công cụ giám sát hiệu năng
- 🔄 Tối ưu hóa prompt tự động

### Giai đoạn 3: Mở rộng (v2.0) 📋 Tương lai
- 📋 Hỗ trợ đa ngôn ngữ
- 📋 Integration marketplace
- 📋 Tùy chọn white-label
- 📋 Hỗ trợ giọng nói/video

---

## 10. Tiêu Chí Chấp Nhận

### Định Nghĩa Hoàn Thành
Một tính năng được coi là "hoàn thành" khi:
- ✅ Code được triển khai và xem xét
- ✅ Unit tests được viết và pass
- ✅ Integration tests pass
- ✅ Tài liệu được cập nhật
- ✅ Xem xét bảo mật hoàn thành
- ✅ Đáp ứng benchmarks hiệu năng
- ✅ Triển khai lên môi trường staging
- ✅ Kiểm thử chấp nhận người dùng hoàn thành

---

## 11. Phụ Lục

### 11.1 Thuật Ngữ
- **Agent:** Thực thể AI xử lý các cuộc hội thoại domain cụ thể
- **Supervisor:** Agent định tuyến xác định ý định và ủy quyền
- **Domain Agent:** Agent chuyên biệt cho ngữ cảnh kinh doanh cụ thể
- **RAG:** Retrieval-Augmented Generation (tìm kiếm knowledge base)
- **Escalation:** Chuyển từ AI agent sang supporter nhân viên
- **Tenant:** Tổ chức độc lập sử dụng nền tảng
- **Widget:** Giao diện chat có thể nhúng
- **Tool:** Chức năng mà agents có thể thực thi (API call, database query, v.v.)

### 11.2 Tài Liệu Tham Khảo
- Tài liệu Kiến trúc: `/document-project/architecture-backend.md`
- Tài liệu API: `/document-project/api-contracts-backend.md`
- Hướng dẫn Thiết lập: `/document-project/BACKEND_SETUP.md`
- Thiết lập Tenant: `/document-project/TENANT_SETUP_GUIDE.md`

---

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
**Chủ sở hữu:** Nhóm Phát triển
