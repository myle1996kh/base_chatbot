# Chatbot AI Documentation Site

Tài liệu kỹ thuật được xây dựng bằng [Docusaurus](https://docusaurus.io/).

## 🚀 Quick Start

### Cài đặt

```bash
# Cài đặt dependencies
npm install

# Hoặc dùng yarn
yarn install
```

### Copy tài liệu từ folder ../docs

```bash
# Chạy script để copy và format tài liệu
node copy-docs.js
```

Script này sẽ:
- Copy tất cả file `.md` từ `../docs/` sang `./docs/`
- Tự động thêm frontmatter cho Docusaurus
- Map filename sang doc ID phù hợp

### Development

```bash
# Start local development server
npm start

# Hoặc
yarn start
```

Truy cập: http://localhost:3000

Server sẽ tự động reload khi bạn thay đổi file.

### Build

```bash
# Build static website
npm run build

# Hoặc
yarn build
```

Output sẽ được tạo trong folder `build/`.

### Deploy

```bash
# Serve build locally để test
npm run serve

# Deploy lên GitHub Pages
npm run deploy
```

## 📁 Cấu Trúc

```
docusaurus-site/
├── docs/                       # Markdown documentation files
│   ├── intro.md               # Homepage
│   ├── prd.md                 # From PRD_VI.md
│   ├── user-stories.md        # From USER_STORIES_VI.md
│   ├── architecture.md        # From ARCHITECTURE_VI.md
│   └── ...                    # Other docs
│
├── src/
│   └── css/
│       └── custom.css         # Custom styling
│
├── static/
│   └── img/                   # Static images
│
├── docusaurus.config.js       # Site configuration
├── sidebars.js                # Sidebar structure
├── copy-docs.js               # Script to copy docs
└── package.json               # Dependencies
```

## 📝 Thêm Tài Liệu Mới

### Option 1: Tự động (Khuyên dùng)

1. Thêm file vào `../docs/`
2. Update `FILE_MAPPING` trong `copy-docs.js`
3. Chạy `node copy-docs.js`
4. Update `sidebars.js` nếu cần

### Option 2: Thủ công

1. Tạo file `.md` trong `docs/`
2. Thêm frontmatter:

```markdown
---
id: my-doc
title: My Document
sidebar_position: 1
---

# My Document

Content here...
```

3. Update `sidebars.js`:

```javascript
{
  type: 'doc',
  id: 'my-doc',
  label: 'My Document',
}
```

## 🎨 Customization

### Theme Colors

Edit `src/css/custom.css`:

```css
:root {
  --ifm-color-primary: #2e8555;
  /* ... */
}
```

### Navbar & Footer

Edit `docusaurus.config.js`:

```javascript
navbar: {
  title: 'Your Title',
  logo: {
    alt: 'Logo',
    src: 'img/logo.svg',
  },
  items: [
    // ...
  ],
},
```

### Sidebar Structure

Edit `sidebars.js`:

```javascript
const sidebars = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['intro', 'tutorial'],
    },
    // ...
  ],
};
```

## 🌐 Internationalization (i18n)

Docusaurus đã được cấu hình với 2 ngôn ngữ:
- **vi** (Tiếng Việt) - Default
- **en** (English)

### Thêm bản dịch

```bash
# Generate translation files
npm run write-translations -- --locale en

# Edit translations in i18n/en/...
```

## 🔍 Search

### Option 1: Algolia DocSearch (Free for open source)

1. Apply tại https://docsearch.algolia.com/
2. Update `docusaurus.config.js`:

```javascript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'YOUR_INDEX_NAME',
},
```

### Option 2: Local Search Plugin

```bash
npm install --save @easyops-cn/docusaurus-search-local
```

Update `docusaurus.config.js`:

```javascript
themes: [
  [
    require.resolve("@easyops-cn/docusaurus-search-local"),
    {
      hashed: true,
      language: ["en", "vi"],
    },
  ],
],
```

## 📦 Deployment Options

### GitHub Pages

1. Update `docusaurus.config.js`:

```javascript
url: 'https://your-username.github.io',
baseUrl: '/your-repo-name/',
organizationName: 'your-username',
projectName: 'your-repo-name',
```

2. Deploy:

```bash
GIT_USER=your-username npm run deploy
```

### Netlify

1. Build command: `npm run build`
2. Publish directory: `build`

### Vercel

1. Import repository
2. Framework Preset: Docusaurus
3. Deploy

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
```

## 🛠️ Troubleshooting

### Port already in use

```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Clear cache

```bash
npm run clear
```

### Broken links

```bash
# Check for broken links
npm run build
```

Docusaurus sẽ warning về broken links trong quá trình build.

## 📚 Resources

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Markdown Guide](https://docusaurus.io/docs/markdown-features)
- [Deployment Guide](https://docusaurus.io/docs/deployment)
- [Community Chat](https://discord.gg/docusaurus)

## 📄 License

MIT

---

**Version:** 1.0.0
**Docusaurus Version:** 3.1.0
**Node Version:** >=18.0
