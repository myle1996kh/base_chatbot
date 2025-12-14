/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '🏠 Trang chủ',
    },
    {
      type: 'category',
      label: '📋 Quản lý Dự án',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'prd',
          label: 'PRD - Yêu cầu Sản phẩm',
        },
        {
          type: 'doc',
          id: 'user-stories',
          label: 'User Stories',
        },
      ],
    },
    {
      type: 'category',
      label: '🏗️ Kiến trúc Hệ thống',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'architecture',
          label: 'Tổng quan Kiến trúc',
        },
        {
          type: 'doc',
          id: 'data-model',
          label: 'Mô hình Dữ liệu',
        },
        {
          type: 'doc',
          id: 'flow-diagrams',
          label: 'Sơ đồ Luồng',
        },
      ],
    },
    {
      type: 'category',
      label: '🤖 Agent & RAG System',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'agent-config-flow',
          label: 'Flow Cấu hình Agent',
        },
        {
          type: 'doc',
          id: 'rag-flow',
          label: 'Flow RAG Agent',
        },
      ],
    },
    {
      type: 'category',
      label: '🚀 Deployment & Testing',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'pipeline-cicd',
          label: 'Pipeline & CI/CD',
        },
        {
          type: 'doc',
          id: 'test-plan',
          label: 'Kế hoạch Kiểm thử',
        },
      ],
    },
    {
      type: 'category',
      label: '🔍 Code Quality',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'code-review-improvement',
          label: 'Đánh giá & Cải thiện Code',
        },
      ],
    },
    {
      type: 'category',
      label: '📚 Tài liệu Tiếng Anh',
      collapsed: true,
      items: [
        {
          type: 'link',
          label: 'Backend Architecture',
          href: '/en/architecture-backend',
        },
        {
          type: 'link',
          label: 'Frontend Architecture',
          href: '/en/architecture-frontend',
        },
        {
          type: 'link',
          label: 'API Contracts',
          href: '/en/api-contracts',
        },
        {
          type: 'link',
          label: 'Setup Guide',
          href: '/en/backend-setup',
        },
      ],
    },
  ],
};

export default sidebars;
