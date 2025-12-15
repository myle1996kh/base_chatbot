# 🔧 Section & Title Unknown - Quick Fix Guide

**Solutions for handling missing section_number and section_title in current approach**

---

## 🎯 Problem Analysis

From `RAG_FLOW_TEST.ipynb` Cell 5 output:
```
❌ 569 chunks (100%) - Missing section information
❌ 569 chunks (100%) - Missing title/heading information
⚠️  Chunking breaks at 900 chars - May split tables/structured content
```

**Why this happens:**
- LangChain `DocumentLoader` (PDFPlumber, python-docx) only extracts text
- `RecursiveCharacterTextSplitter` chunks by character count, ignoring document structure
- No heading/section detection in current pipeline
- Metadata not enriched during processing

---

## ⚡ Quick Fixes (In Order of Implementation)

### Fix 1: Heading Detection (Immediate - 2 hours)

**What:** Add regex-based heading detection to current chunks
**Impact:** ~30-40% chunks get section info (if document has headings)
**Effort:** Low

```python
import re

def detect_section_from_content(chunk_content: str) -> tuple:
    """Extract section number and title from chunk if it contains heading"""

    # Pattern 1: Markdown headings
    heading_match = re.match(r'^(#+)\s+(.+?)$', chunk_content, re.MULTILINE)
    if heading_match:
        level = len(heading_match.group(1))
        title = heading_match.group(2).strip()
        return (level, title)

    # Pattern 2: Numbered sections (1. Introduction, 2.1 Background)
    section_match = re.match(r'^(\d+(?:\.\d+)*)\s+(.+?)$', chunk_content, re.MULTILINE)
    if section_match:
        section_num = section_match.group(1)
        title = section_match.group(2).strip()
        return (section_num, title)

    # Pattern 3: ALL CAPS headings
    caps_match = re.match(r'^([A-Z][A-Z\s]+)$', chunk_content.split('\n')[0])
    if caps_match:
        title = caps_match.group(1).strip()
        return (None, title)

    return (None, None)

# Usage in chunk processing
for i, chunk in enumerate(chunks):
    section_num, title = detect_section_from_content(chunk.page_content)
    chunk.metadata['section_number'] = section_num or 'Unknown'
    chunk.metadata['section_title'] = title or 'Unknown'
```

**Pros:**
- Works with existing chunks
- No re-processing needed
- Fast (~100ms for 569 chunks)

**Cons:**
- Only detects explicit headings
- Doesn't understand hierarchy
- False positives possible

---

### Fix 2: Content-Type Detection (2 hours)

**What:** Detect tables, lists, code blocks automatically
**Impact:** Can differentiate chunk types for query-aware retrieval
**Effort:** Low-Medium

```python
def detect_content_type(chunk_content: str) -> str:
    """Detect if chunk contains table, list, code, or regular text"""

    content = chunk_content.strip()

    # Table detection: pipe separators or grid pattern
    if '|' in content and content.count('|') > 3:
        return 'table'

    # Code block detection
    if '```' in content or content.count('    ') > 3:
        return 'code'

    # List detection: bullet points or numbered items
    if re.match(r'^(\s*[-*•]|\s*\d+\.)', content, re.MULTILINE):
        return 'list'

    # Figure/Image caption detection
    if any(kw in content.lower() for kw in ['figure', 'fig.', 'image', 'image:']):
        return 'figure'

    # JSON/structured data
    try:
        json.loads(content)
        return 'json'
    except:
        pass

    return 'text'

# Usage
for chunk in chunks:
    chunk.metadata['content_type'] = detect_content_type(chunk.page_content)
```

---

### Fix 3: Section Tracking (3 hours)

**What:** Track section context as you process chunks
**Impact:** Every chunk knows its parent section
**Effort:** Medium

```python
def add_section_context(chunks: List) -> List:
    """Add section context by tracking headings as you traverse chunks"""

    section_stack = []  # Stack of (level, section_num, title)
    section_counter = 0
    processed_chunks = []

    for chunk in chunks:
        section_num, title = detect_section_from_content(chunk.page_content)

        if section_num:  # Found a new section
            # Update section stack
            level = 1  # Assume top-level if just a number
            section_counter += 1

            section_stack.append((level, section_counter, title))

            chunk.metadata['section_number'] = section_counter
            chunk.metadata['section_title'] = title
            chunk.metadata['is_heading'] = True
        else:
            # Not a heading - use current section context
            if section_stack:
                _, current_section, current_title = section_stack[-1]
                chunk.metadata['section_number'] = current_section
                chunk.metadata['section_title'] = current_title
            else:
                chunk.metadata['section_number'] = None
                chunk.metadata['section_title'] = 'Preamble'

            chunk.metadata['is_heading'] = False

        processed_chunks.append(chunk)

    return processed_chunks

# Usage
chunks = add_section_context(chunks)
```

---

### Fix 4: Metadata Enrichment (2 hours)

**What:** Store enriched metadata in PostgreSQL for query filtering
**Impact:** Can filter/rerank by section, type, etc.
**Effort:** Low

```python
# In RAG Service
def enrich_chunk_metadata(chunk, document_id: str) -> dict:
    """Create rich metadata dict for storage"""

    return {
        'section_number': chunk.metadata.get('section_number'),
        'section_title': chunk.metadata.get('section_title'),
        'content_type': chunk.metadata.get('content_type', 'text'),
        'is_heading': chunk.metadata.get('is_heading', False),
        'page_number': chunk.metadata.get('page'),
        'source': chunk.metadata.get('source'),
        'document_id': document_id,
        'processing_date': datetime.now().isoformat(),
        'docling_processed': False,  # Flag for migration
    }

# Store in DB
metadata_json = enrich_chunk_metadata(chunk, doc_id)
```

---

## 🚀 Recommended Sequence (Progressive Enhancement)

### Today (Immediate Fix - 30 min)
```python
# In notebook Cell 5, before chunking:

import re

def enrich_chunks_with_sections(chunks):
    """Quick fix: Add section detection to existing chunks"""
    section_counter = 0
    current_section = None

    for chunk in chunks:
        # Try to detect heading
        match = re.match(r'^(#+)\s+(.+?)$', chunk.page_content, re.MULTILINE)
        if match:
            section_counter += 1
            current_section = match.group(2).strip()
            chunk.metadata['section_number'] = section_counter
            chunk.metadata['section_title'] = current_section
        else:
            chunk.metadata['section_number'] = current_section or 0
            chunk.metadata['section_title'] = current_section or 'Untitled'

    return chunks

# Apply fix
chunks = enrich_chunks_with_sections(chunks)
```

### Week 1 (Complete Fix - 8 hours)
1. Implement all 4 fixes above
2. Update RAG_FLOW_TEST.ipynb to show improvements
3. Store enriched metadata in database
4. Test retrieval with section awareness

### Week 2 (Docling Integration)
1. Install Docling
2. Create DoclingProcessor
3. Test with RAG_FLOW_TEST.ipynb
4. Compare: Current Fix vs Docling
5. Plan migration

---

## 📊 Expected Results

| Approach | Section Detection | Implementation | Quality |
|----------|------------------|-----------------|---------|
| Current | 0% | ❌ None | Poor |
| Fix 1-4 | 40-60% | ✅ Quick | Fair |
| Docling | 95%+ | ✅ Full | Excellent |

---

## 🎓 Why Docling is Better

**Quick Fixes limitations:**
- ❌ Only detect explicit headings (not all docs have them)
- ❌ Can't preserve table structure
- ❌ No bounding box/location info
- ❌ Manual regex patterns (fragile)

**Docling advantages:**
- ✅ AI-powered section detection
- ✅ Structured table extraction
- ✅ Precise location tracking
- ✅ Handles PDFs/Word/etc. consistently
- ✅ Future-proof architecture

---

## 🔗 Implementation Decision Tree

```
Do you need section/metadata info?
├─ NO → Keep current (LangChain)
├─ YES, urgently needed?
│   ├─ YES → Implement Fixes 1-4 (same day)
│   └─ NO → Plan Docling integration
└─ YES, high quality needed?
    └─ Use Docling (recommended for production)
```

---

## 📋 Rollout Checklist

### Phase 0: Quick Fix (Today)
- [ ] Implement heading detection (Fix 1)
- [ ] Add to Cell 5 in notebook
- [ ] Verify section detection improves
- [ ] Test retrieval quality

### Phase 1: Complete Quick Fix (This week)
- [ ] Implement content-type detection (Fix 2)
- [ ] Implement section tracking (Fix 3)
- [ ] Implement metadata enrichment (Fix 4)
- [ ] Update database schema
- [ ] Update RAG service to use metadata
- [ ] Test enhanced retrieval

### Phase 2: Plan Docling (Next week)
- [ ] Review DOCLING_INTEGRATION_GUIDE.md
- [ ] Install Docling in dev environment
- [ ] Create DoclingProcessor
- [ ] Test with notebook
- [ ] Plan production migration

### Phase 3: Deploy Docling (Following week)
- [ ] Create migration script
- [ ] Re-ingest all documents with Docling
- [ ] Update retrieval algorithms
- [ ] Monitor metrics
- [ ] Deprecate old processor

---

## 🆘 Troubleshooting

**Q: Chunks still showing "Unknown" sections?**
A: Check if your document has explicit headings. If not, use Docling for AI-powered detection.

**Q: Section numbers jumping/wrong?**
A: The regex might be picking up false positives. Refine the patterns or use Docling.

**Q: Content-type detection missing tables?**
A: Depends on table format. Use Docling for 100% table preservation.

**Q: Performance degradation?**
A: Metadata enrichment adds <100ms. If significant, use async processing or batch operations.

