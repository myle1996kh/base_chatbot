# 🚀 Hướng Dẫn Deploy Docusaurus lên GitHub Pages

## Tổng Quan

Documentation site sẽ được host miễn phí tại:
**https://myle1996kh.github.io/base_chatbot/**

## Các Bước Deploy

### Bước 1: Kích hoạt GitHub Pages

1. Truy cập repository: https://github.com/myle1996kh/base_chatbot
2. Click vào **Settings** (⚙️)
3. Chọn **Pages** trong sidebar trái
4. Trong phần **Source**, chọn:
   - **Source**: GitHub Actions
5. Click **Save**

### Bước 2: Push Code lên GitHub

```bash
# Đảm bảo bạn đang ở thư mục gốc của project
cd "c:\Users\gensh\Downloads\New folder\base_chatbot"

# Add tất cả các thay đổi
git add .

# Commit
git commit -m "Add Docusaurus documentation site with GitHub Pages deployment"

# Push lên main branch
git push origin main
```

### Bước 3: Theo dõi Deployment

1. Vào repository trên GitHub
2. Click vào tab **Actions**
3. Bạn sẽ thấy workflow "Deploy Docusaurus to GitHub Pages" đang chạy
4. Chờ khoảng 2-3 phút để build và deploy hoàn tất
5. Khi có dấu ✅ màu xanh → deployment thành công!

### Bước 4: Truy cập Website

Sau khi deployment thành công, truy cập:

🌐 **https://myle1996kh.github.io/base_chatbot/**

## Tự Động Deploy

GitHub Actions đã được cấu hình để tự động deploy khi:

- ✅ Có thay đổi trong folder `docusaurus-site/`
- ✅ Có thay đổi trong folder `docs/` (documentation markdown files)
- ✅ Push lên branch `main`

**Nghĩa là:** Mỗi khi bạn cập nhật documentation và push lên GitHub, website sẽ tự động được build và deploy!

## Cập Nhật Documentation

### Cách 1: Cập nhật file trong `docs/` (Khuyên dùng)

```bash
# 1. Chỉnh sửa các file trong folder docs/
# Ví dụ: docs/PRD_VI.md, docs/USER_STORIES_VI.md, etc.

# 2. Push lên GitHub
git add docs/
git commit -m "Update documentation"
git push origin main

# 3. GitHub Actions sẽ tự động:
#    - Copy docs từ ../docs sang docusaurus-site/docs
#    - Build website
#    - Deploy lên GitHub Pages
```

### Cách 2: Cập nhật trực tiếp trong `docusaurus-site/docs/`

```bash
# 1. Chỉnh sửa file trong docusaurus-site/docs/

# 2. Push lên GitHub
git add docusaurus-site/
git commit -m "Update Docusaurus docs"
git push origin main
```

## Kiểm Tra Local Trước Khi Deploy

```bash
cd docusaurus-site

# Copy docs mới nhất
node copy-docs.js

# Build để kiểm tra lỗi
npm run build

# Serve local để xem trước
npm run serve
# Truy cập: http://localhost:3000
```

## Troubleshooting

### Deployment Failed

1. Vào GitHub → Actions → Click vào workflow failed
2. Xem logs để tìm lỗi
3. Thường gặp:
   - **MDX compilation error**: Lỗi trong markdown syntax
   - **Build error**: Lỗi cấu hình hoặc dependencies
   - **Permission error**: Chưa enable GitHub Pages

### Website không hiển thị

1. Đợi 2-3 phút sau khi deployment thành công
2. Clear browser cache (Ctrl + Shift + R)
3. Kiểm tra URL đúng: https://myle1996kh.github.io/base_chatbot/
4. Kiểm tra Settings → Pages → Source phải là "GitHub Actions"

### Broken Links hoặc 404

- Kiểm tra `baseUrl: '/base_chatbot/'` trong docusaurus.config.js
- Đảm bảo tất cả internal links không có hardcoded domain

## Custom Domain (Tùy chọn)

Nếu bạn có domain riêng (ví dụ: docs.chatbot.com):

1. Trong Settings → Pages → Custom domain
2. Nhập domain của bạn
3. Update `docusaurus.config.js`:
   ```javascript
   url: 'https://docs.chatbot.com',
   baseUrl: '/',
   ```

## Chi phí

- **GitHub Pages**: MIỄN PHÍ hoàn toàn
- **Băng thông**: 100GB/tháng (miễn phí)
- **Build time**: Unlimited (GitHub Actions free tier)
- **Storage**: 1GB cho published site

## Workflow Configuration

File workflow tại: `.github/workflows/deploy-docs.yml`

**Triggers:**
- Push to `main` branch
- Changes trong `docusaurus-site/**` hoặc `docs/**`
- Manual trigger (workflow_dispatch)

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run `copy-docs.js` để copy docs
5. Build Docusaurus
6. Upload artifact
7. Deploy to GitHub Pages

## Logs & Monitoring

- **Deployment history**: Repository → Environments → github-pages
- **Build logs**: Repository → Actions → Workflow runs
- **Analytics**: GitHub Insights (nếu public repo)

## Bảo Mật

- ✅ Website chỉ serve static files (không có server-side code)
- ✅ HTTPS được enable mặc định
- ✅ Không có database hoặc user data
- ✅ Safe cho public documentation

---

**Cần hỗ trợ?**
- GitHub Pages Docs: https://docs.github.com/en/pages
- Docusaurus Deployment: https://docusaurus.io/docs/deployment
- GitHub Actions: https://docs.github.com/en/actions
