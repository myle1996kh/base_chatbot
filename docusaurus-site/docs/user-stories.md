---
id: user-stories
title: User Stories
sidebar_position: 3
---

# User Stories - Câu Chuyện Người Dùng
# Nền Tảng Chatbot AI Đa Tenant

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025

---

## Mục Lục
1. [User Stories - Quản Trị Viên Hệ Thống](#1-admin-hệ-thống)
2. [User Stories - Quản Trị Viên Tenant](#2-quản-trị-viên-tenant)
3. [User Stories - Nhân Viên Hỗ Trợ](#3-nhân-viên-hỗ-trợ-supporter)
4. [User Stories - Khách Hàng Cuối](#4-khách-hàng-cuối-chat-user)
5. [User Stories - Developer/DevOps](#5-developerdevops)

---

## 1. Admin Hệ Thống

### US-1.1: Quản Lý Tenant
**Là một** Admin hệ thống
**Tôi muốn** tạo và quản lý các tenant (tổ chức)
**Để** cho phép nhiều tổ chức sử dụng nền tảng với dữ liệu riêng biệt

**Acceptance Criteria:**
- ✅ Tôi có thể tạo tenant mới với thông tin: tên, domain, trạng thái
- ✅ Tôi có thể xem danh sách tất cả tenants
- ✅ Tôi có thể chỉnh sửa thông tin tenant
- ✅ Tôi có thể vô hiệu hóa/kích hoạt tenant
- ✅ Mỗi tenant có `tenant_id` unique
- ✅ Khi tạo tenant, hệ thống tự động tạo cấu hình mặc định

**Priority:** P0 (Critical)
**Story Points:** 8
**Status:** ✅ Implemented

---

### US-1.2: Cấu Hình Quyền Tenant
**Là một** Admin hệ thống
**Tôi muốn** cấu hình quyền truy cập agents và tools cho từng tenant
**Để** kiểm soát tính năng nào tenant có thể sử dụng

**Acceptance Criteria:**
- ✅ Tôi có thể bật/tắt agents cụ thể cho tenant
- ✅ Tôi có thể bật/tắt tools cụ thể cho tenant
- ✅ Tôi có thể ghi đè cấu hình output format cho tenant
- ✅ Cấu hình quyền có hiệu lực ngay lập tức
- ✅ Tenant không thể truy cập agents/tools đã bị tắt

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-1.3: Quản Lý Người Dùng
**Là một** Admin hệ thống
**Tôi muốn** tạo và quản lý tài khoản người dùng
**Để** cho phép nhân viên và admin truy cập hệ thống

**Acceptance Criteria:**
- ✅ Tôi có thể tạo user mới với email, mật khẩu, vai trò
- ✅ Các vai trò có sẵn: admin, supporter, tenant_user
- ✅ Tôi có thể gán user vào tenant cụ thể
- ✅ Tôi có thể thay đổi vai trò của user
- ✅ Tôi có thể vô hiệu hóa tài khoản user
- ✅ Mật khẩu được hash an toàn (bcrypt)

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-1.4: Quản Lý Agents
**Là một** Admin hệ thống
**Tôi muốn** tạo và cấu hình các AI agents
**Để** mở rộng khả năng của hệ thống

**Acceptance Criteria:**
- ✅ Tôi có thể tạo agent mới với tên, prompt template
- ✅ Tôi có thể chọn LLM model cho agent
- ✅ Tôi có thể gán tools cho agent với mức độ ưu tiên
- ✅ Tôi có thể chỉnh sửa prompt template của agent
- ✅ Tôi có thể kích hoạt/vô hiệu hóa agent
- ✅ Thay đổi cấu hình có hiệu lực ngay (hoặc sau khi reload cache)

**Priority:** P0 (Critical)
**Story Points:** 8
**Status:** ✅ Implemented

---

### US-1.5: Quản Lý Tools
**Là một** Admin hệ thống
**Tôi muốn** tạo và cấu hình các tools mà agents có thể sử dụng
**Để** mở rộng chức năng của agents

**Acceptance Criteria:**
- ✅ Tôi có thể tạo tool mới với loại: HTTP, RAG, Custom
- ✅ Tôi có thể định nghĩa JSON schema cho input của tool
- ✅ Với HTTP tool, tôi có thể cấu hình endpoint, method, headers
- ✅ Tôi có thể chỉnh sửa cấu hình tool
- ✅ Tôi có thể vô hiệu hóa tool
- ✅ Tool chỉ có thể được sử dụng nếu được gán cho agent và tenant có quyền

**Priority:** P1 (High)
**Story Points:** 8
**Status:** ✅ Implemented

---

### US-1.6: Giám Sát Sessions
**Là một** Admin hệ thống
**Tôi muốn** xem tất cả các phiên chat đang diễn ra
**Để** giám sát hoạt động và phát hiện vấn đề

**Acceptance Criteria:**
- ✅ Tôi có thể xem danh sách tất cả sessions
- ✅ Tôi có thể lọc sessions theo tenant, agent, trạng thái
- ✅ Tôi có thể xem chi tiết session và lịch sử tin nhắn
- ✅ Tôi có thể xem metadata: số tokens, thời gian phản hồi, intents
- ✅ Tôi có thể xem sessions đã escalate

**Priority:** P1 (High)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-1.7: Quản Lý LLM Models
**Là một** Admin hệ thống
**Tôi muốn** cấu hình các LLM providers và models
**Để** agents có thể sử dụng các mô hình AI khác nhau

**Acceptance Criteria:**
- ✅ Hệ thống hỗ trợ nhiều providers: OpenAI, Anthropic, Google, OpenRouter
- ✅ Tôi có thể cấu hình API keys cho mỗi provider
- ✅ API keys được mã hóa khi lưu trữ (Fernet encryption)
- ✅ Tôi có thể đặt model mặc định cho hệ thống
- ✅ Tenant có thể override bằng API key riêng

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

## 2. Quản Trị Viên Tenant

### US-2.1: Tải Lên Knowledge Base
**Là một** Quản trị viên tenant
**Tôi muốn** tải lên tài liệu vào knowledge base
**Để** chatbot có thể trả lời câu hỏi dựa trên tài liệu của tổ chức

**Acceptance Criteria:**
- ✅ Tôi có thể tải lên file PDF và DOCX
- ✅ File có kích thước tối đa 100MB
- ✅ Hệ thống tự động trích xuất text từ tài liệu
- ✅ Văn bản được chia thành chunks và tạo embeddings
- ✅ Tài liệu được lưu trong pgvector với tenant_id
- ✅ Tôi chỉ thấy tài liệu của tenant tôi

**Priority:** P0 (Critical)
**Story Points:** 8
**Status:** ✅ Implemented

---

### US-2.2: Tìm Kiếm Knowledge Base
**Là một** Quản trị viên tenant
**Tôi muốn** tìm kiếm và xem tài liệu trong knowledge base
**Để** kiểm tra nội dung đã được index

**Acceptance Criteria:**
- ✅ Tôi có thể tìm kiếm theo từ khóa
- ✅ Kết quả hiển thị độ tương đồng (similarity score)
- ✅ Tôi có thể xem nội dung chunk cụ thể
- ✅ Tôi có thể xóa tài liệu khỏi knowledge base
- ✅ Kết quả chỉ hiển thị tài liệu của tenant tôi

**Priority:** P1 (High)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-2.3: Tùy Chỉnh Widget
**Là một** Quản trị viên tenant
**Tôi muốn** tùy chỉnh giao diện chat widget
**Để** phù hợp với branding của tổ chức

**Acceptance Criteria:**
- ✅ Tôi có thể thay đổi màu sắc chủ đạo
- ✅ Tôi có thể thay đổi vị trí widget (góc phải/trái)
- ✅ Tôi có thể tùy chỉnh tin nhắn chào mừng
- ✅ Tôi có thể thêm logo của tổ chức
- ✅ Tôi có thể xem preview widget trước khi áp dụng
- ✅ Thay đổi được lưu và áp dụng ngay lập tức

**Priority:** P1 (High)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-2.4: Cấu Hình API Keys Riêng
**Là một** Quản trị viên tenant
**Tôi muốn** sử dụng API keys LLM của riêng tôi
**Để** kiểm soát chi phí và không phụ thuộc vào nền tảng

**Acceptance Criteria:**
- ✅ Tôi có thể nhập OpenAI API key
- ✅ Tôi có thể nhập Anthropic API key
- ✅ Tôi có thể nhập OpenRouter API key
- ✅ API keys được mã hóa khi lưu
- ✅ Nếu không cung cấp, hệ thống sử dụng keys mặc định

**Priority:** P1 (High)
**Story Points:** 3
**Status:** ✅ Implemented

---

### US-2.5: Xem Analytics
**Là một** Quản trị viên tenant
**Tôi muốn** xem báo cáo sử dụng chatbot
**Để** đánh giá hiệu quả và tối ưu hóa

**Acceptance Criteria:**
- 🔄 Tôi có thể xem số lượng sessions theo thời gian
- 🔄 Tôi có thể xem số lượng messages
- 🔄 Tôi có thể xem tỷ lệ escalation
- 🔄 Tôi có thể xem thời gian phản hồi trung bình
- 🔄 Tôi có thể export báo cáo

**Priority:** P2 (Medium)
**Story Points:** 8
**Status:** 🟡 Planned (v1.1)

---

## 3. Nhân Viên Hỗ Trợ (Supporter)

### US-3.1: Xem Hàng Đợi Escalation
**Là một** Nhân viên hỗ trợ
**Tôi muốn** xem danh sách các phiên chat đã được escalate
**Để** biết các yêu cầu cần xử lý

**Acceptance Criteria:**
- ✅ Tôi có thể xem danh sách sessions với trạng thái "pending"
- ✅ Danh sách hiển thị thời gian chờ
- ✅ Danh sách hiển thị lý do escalation
- ✅ Tôi có thể lọc theo tenant (nếu supporter quản lý nhiều tenant)
- ✅ Danh sách tự động cập nhật khi có escalation mới

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-3.2: Chấp Nhận Escalation
**Là một** Nhân viên hỗ trợ
**Tôi muốn** chấp nhận một phiên chat từ hàng đợi
**Để** bắt đầu hỗ trợ khách hàng

**Acceptance Criteria:**
- ✅ Tôi có thể click vào session trong hàng đợi
- ✅ Khi chấp nhận, session được gán cho tôi
- ✅ Trạng thái session chuyển từ "pending" sang "assigned"
- ✅ Tôi có thể xem toàn bộ lịch sử hội thoại
- ✅ Khách hàng được thông báo có supporter đã tham gia

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-3.3: Chat Với Khách Hàng
**Là một** Nhân viên hỗ trợ
**Tôi muốn** chat trực tiếp với khách hàng
**Để** giải quyết vấn đề của họ

**Acceptance Criteria:**
- ✅ Tôi có thể gửi tin nhắn cho khách hàng
- ✅ Tin nhắn xuất hiện ngay lập tức trong widget của khách hàng
- ✅ Tôi nhận được tin nhắn từ khách hàng theo thời gian thực
- ✅ Tôi có thể thấy khi khách hàng đang gõ
- ✅ Tin nhắn supporter được đánh dấu rõ ràng (role = "supporter")

**Priority:** P0 (Critical)
**Story Points:** 8
**Status:** ✅ Implemented

---

### US-3.4: Đánh Dấu Đã Giải Quyết
**Là một** Nhân viên hỗ trợ
**Tôi muốn** đánh dấu phiên chat là đã giải quyết
**Để** đóng ticket và cập nhật trạng thái

**Acceptance Criteria:**
- ✅ Tôi có thể click nút "Resolve" trên session
- ✅ Trạng thái chuyển từ "assigned" sang "resolved"
- ✅ Session biến mất khỏi hàng đợi của tôi
- ✅ Khách hàng có thể tiếp tục chat (tạo escalation mới nếu cần)
- ✅ Lịch sử được lưu lại đầy đủ

**Priority:** P0 (Critical)
**Story Points:** 3
**Status:** ✅ Implemented

---

### US-3.5: Xem Thông Tin Khách Hàng
**Là một** Nhân viên hỗ trợ
**Tôi muốn** xem thông tin về khách hàng
**Để** có ngữ cảnh khi hỗ trợ

**Acceptance Criteria:**
- ✅ Tôi có thể xem metadata của chat_user
- ✅ Tôi có thể xem các sessions trước đó của khách hàng
- ✅ Tôi có thể xem tóm tắt vấn đề từ agent
- 🔄 Tôi có thể thấy tags hoặc notes từ các lần hỗ trợ trước

**Priority:** P1 (High)
**Story Points:** 5
**Status:** ✅ Partial (metadata viewing implemented)

---

## 4. Khách Hàng Cuối (Chat User)

### US-4.1: Bắt Đầu Chat
**Là một** Khách hàng
**Tôi muốn** mở chat widget và bắt đầu hội thoại
**Để** nhận được hỗ trợ nhanh chóng

**Acceptance Criteria:**
- ✅ Tôi thấy icon widget ở góc màn hình
- ✅ Khi click, widget mở ra với tin nhắn chào mừng
- ✅ Session tự động được tạo hoặc tiếp tục nếu đã có
- ✅ Widget hiển thị nhanh (\<500ms)
- ✅ Giao diện responsive trên mobile và desktop

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-4.2: Gửi Tin Nhắn
**Là một** Khách hàng
**Tôi muốn** gửi tin nhắn đến chatbot
**Để** đặt câu hỏi hoặc yêu cầu hỗ trợ

**Acceptance Criteria:**
- ✅ Tôi có thể gõ tin nhắn vào ô input
- ✅ Tôi có thể gửi bằng Enter hoặc nút Send
- ✅ Tin nhắn của tôi hiển thị ngay lập tức
- ✅ Chatbot hiển thị "đang gõ..." khi đang xử lý
- ✅ Phản hồi xuất hiện trong vòng 2 giây

**Priority:** P0 (Critical)
**Story Points:** 3
**Status:** ✅ Implemented

---

### US-4.3: Nhận Phản Hồi Từ Agent
**Là một** Khách hàng
**Tôi muốn** nhận câu trả lời chính xác từ chatbot
**Để** giải quyết vấn đề của tôi

**Acceptance Criteria:**
- ✅ Chatbot trả lời dựa trên knowledge base của tổ chức
- ✅ Câu trả lời được format đẹp (hỗ trợ markdown)
- ✅ Nếu câu hỏi không rõ, chatbot yêu cầu làm rõ
- ✅ Phản hồi được stream từng phần (SSE)
- ✅ Chatbot có thể gọi tools để truy vấn dữ liệu

**Priority:** P0 (Critical)
**Story Points:** 8
**Status:** ✅ Implemented

---

### US-4.4: Yêu Cầu Hỗ Trợ Nhân Viên
**Là một** Khách hàng
**Tôi muốn** chuyển sang chat với nhân viên thật
**Để** được hỗ trợ khi chatbot không giải quyết được

**Acceptance Criteria:**
- ✅ Tôi thấy nút "Talk to Human" hoặc "Escalate" trong widget
- ✅ Khi click, yêu cầu được gửi đến hàng đợi hỗ trợ
- ✅ Tôi nhận được thông báo "Đang kết nối với nhân viên hỗ trợ..."
- ✅ Khi supporter tham gia, tôi được thông báo
- ✅ Tôi có thể tiếp tục chat với supporter

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-4.5: Xem Lịch Sử Chat
**Là một** Khách hàng
**Tôi muốn** xem lại các tin nhắn trước đó
**Để** tham khảo thông tin đã được cung cấp

**Acceptance Criteria:**
- ✅ Khi tôi quay lại widget, lịch sử tin nhắn vẫn còn
- ✅ Session được duy trì qua các lần truy cập (cookies/localStorage)
- ✅ Tôi có thể scroll lên xem tin nhắn cũ
- ✅ Lịch sử bao gồm cả tin nhắn từ agent và supporter

**Priority:** P1 (High)
**Story Points:** 3
**Status:** ✅ Implemented

---

### US-4.6: Đánh Giá Phản Hồi
**Là một** Khách hàng
**Tôi muốn** đánh giá độ hữu ích của câu trả lời
**Để** giúp cải thiện chatbot

**Acceptance Criteria:**
- 🔄 Mỗi phản hồi agent có nút thumbs up/down
- 🔄 Tôi có thể thêm feedback text tùy chọn
- 🔄 Feedback được lưu vào database
- 🔄 Admin có thể xem feedback để cải thiện

**Priority:** P2 (Medium)
**Story Points:** 5
**Status:** 🟡 Planned (v1.1)

---

## 5. Developer/DevOps

### US-5.1: Deploy Hệ Thống
**Là một** DevOps Engineer
**Tôi muốn** deploy hệ thống lên production
**Để** cung cấp dịch vụ cho người dùng

**Acceptance Criteria:**
- ✅ Có Dockerfile để build image
- ✅ Có docker-compose.yml cho local development
- ✅ Có hướng dẫn thiết lập môi trường
- ✅ Có health check endpoint (/health)
- ✅ Hỗ trợ biến môi trường cho configuration

**Priority:** P0 (Critical)
**Story Points:** 5
**Status:** ✅ Implemented

---

### US-5.2: Chạy Database Migrations
**Là một** Developer
**Tôi muốn** quản lý schema database qua migrations
**Để** đảm bảo cấu trúc database đồng bộ giữa các môi trường

**Acceptance Criteria:**
- ✅ Sử dụng Alembic cho migrations
- ✅ Migration files có version control
- ✅ Có seed data cho initial setup
- ✅ Command để chạy migrations: `alembic upgrade head`
- ✅ Có rollback mechanism

**Priority:** P0 (Critical)
**Story Points:** 3
**Status:** ✅ Implemented

---

### US-5.3: Monitoring & Logging
**Là một** DevOps Engineer
**Tôi muốn** giám sát hệ thống và xem logs
**Để** phát hiện và khắc phục sự cố

**Acceptance Criteria:**
- ✅ Sử dụng structlog cho structured logging
- ✅ Mỗi request có unique ID
- ✅ Log level có thể cấu hình (DEBUG, INFO, ERROR)
- ✅ Security events được log riêng
- 🔄 Tích hợp với Prometheus/Grafana cho metrics

**Priority:** P1 (High)
**Story Points:** 5
**Status:** ✅ Partial (logging implemented)

---

### US-5.4: Cấu Hình Environment
**Là một** Developer
**Tôi muốn** cấu hình hệ thống qua environment variables
**Để** dễ dàng deploy lên các môi trường khác nhau

**Acceptance Criteria:**
- ✅ Tất cả config sensitive qua env vars
- ✅ Có .env.example làm template
- ✅ Validation env vars khi startup
- ✅ Production mode yêu cầu JWT keys
- ✅ Development mode có thể disable auth

**Priority:** P0 (Critical)
**Story Points:** 3
**Status:** ✅ Implemented

---

### US-5.5: API Testing
**Là một** Developer
**Tôi muốn** test các API endpoints
**Để** đảm bảo chức năng hoạt động đúng

**Acceptance Criteria:**
- ✅ Có Bruno/Postman collection cho API testing
- ✅ Có test cases cho các scenarios chính
- 🔄 Có integration tests tự động
- 🔄 Có unit tests cho business logic
- 🔄 Code coverage >80%

**Priority:** P1 (High)
**Story Points:** 8
**Status:** ✅ Partial (Bruno collection exists)

---

## Tổng Kết

### Thống Kê User Stories

| Nhóm | Tổng số | Completed | In Progress | Planned |
|------|---------|-----------|-------------|---------|
| Admin Hệ thống | 7 | 7 | 0 | 0 |
| Quản trị Tenant | 5 | 4 | 0 | 1 |
| Nhân viên Hỗ trợ | 5 | 4 | 0 | 1 |
| Khách hàng Cuối | 6 | 5 | 0 | 1 |
| Developer/DevOps | 5 | 3 | 0 | 2 |
| **TỔNG** | **28** | **23** | **0** | **5** |

### Story Points

- **Total Story Points:** 146
- **Completed:** 118 (81%)
- **Remaining:** 28 (19%)

---

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
**Chủ sở hữu:** Nhóm Phát triển
