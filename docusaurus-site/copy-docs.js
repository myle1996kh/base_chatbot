/**
 * Script to copy markdown files from ../docs to docusaurus docs folder
 * Automatically adds frontmatter for Docusaurus
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'docs');
const DEST_DIR = path.join(__dirname, 'docs');

// Mapping from source filenames to Docusaurus doc IDs
const FILE_MAPPING = {
  'PRD_VI.md': {
    id: 'prd',
    title: 'PRD - Yêu cầu Sản phẩm',
    position: 2,
  },
  'USER_STORIES_VI.md': {
    id: 'user-stories',
    title: 'User Stories',
    position: 3,
  },
  'ARCHITECTURE_VI.md': {
    id: 'architecture',
    title: 'Kiến trúc Hệ thống',
    position: 4,
  },
  'DATA_MODEL_VI.md': {
    id: 'data-model',
    title: 'Mô hình Dữ liệu',
    position: 5,
  },
  'FLOW_DIAGRAMS_VI.md': {
    id: 'flow-diagrams',
    title: 'Sơ đồ Luồng',
    position: 6,
  },
  'AGENT_CONFIG_FLOW_VI.md': {
    id: 'agent-config-flow',
    title: 'Flow Cấu hình Agent',
    position: 7,
  },
  'RAG_FLOW_VI.md': {
    id: 'rag-flow',
    title: 'Flow RAG Agent',
    position: 8,
  },
  'PIPELINE_CICD_VI.md': {
    id: 'pipeline-cicd',
    title: 'Pipeline & CI/CD',
    position: 9,
  },
  'TEST_PLAN_VI.md': {
    id: 'test-plan',
    title: 'Kế hoạch Kiểm thử',
    position: 10,
  },
  'CODE_REVIEW_IMPROVEMENT_VI.md': {
    id: 'code-review-improvement',
    title: 'Đánh giá & Cải thiện Code',
    position: 11,
  },
};

function addFrontmatter(content, metadata) {
  const frontmatter = `---
id: ${metadata.id}
title: ${metadata.title}
sidebar_position: ${metadata.position}
---

`;
  return frontmatter + content;
}

function copyDocs() {
  console.log('🚀 Starting documentation copy...\n');

  // Ensure destination directory exists
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  let copiedCount = 0;
  let errorCount = 0;

  // Copy each file
  for (const [sourceFile, metadata] of Object.entries(FILE_MAPPING)) {
    const sourcePath = path.join(SOURCE_DIR, sourceFile);
    const destPath = path.join(DEST_DIR, `${metadata.id}.md`);

    try {
      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Source file not found: ${sourceFile}`);
        errorCount++;
        continue;
      }

      // Read source file
      let content = fs.readFileSync(sourcePath, 'utf8');

      // Remove existing frontmatter if any
      content = content.replace(/^---[\s\S]*?---\s*/, '');

      // Escape angle brackets that look like HTML tags with numbers
      // Fix patterns like <500ms, <3s, etc. to prevent MDX JSX parsing errors
      content = content.replace(/<(\d+[a-zA-Z]*)/g, '\\<$1');

      // Add Docusaurus frontmatter
      content = addFrontmatter(content, metadata);

      // Write to destination
      fs.writeFileSync(destPath, content, 'utf8');

      console.log(`✅ Copied: ${sourceFile} → ${metadata.id}.md`);
      copiedCount++;
    } catch (error) {
      console.error(`❌ Error copying ${sourceFile}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully copied: ${copiedCount} files`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} files`);
  }
  console.log(`\n🎉 Done! You can now run: npm start`);
}

// Run the script
copyDocs();
