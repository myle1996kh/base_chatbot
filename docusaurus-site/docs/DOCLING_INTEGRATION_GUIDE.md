# 🚀 Docling Integration Guide for RAG Pipeline

**Complete roadmap for replacing LangChain DocumentProcessor with Docling for better section/table/metadata extraction**

---

## 📊 Current vs Docling Comparison

| Feature | Current (LangChain) | Docling | Impact |
|---------|-------------------|---------|--------|
| **Section Detection** | ❌ None | ✅ GroupItem.SECTION | Know which section content came from |
| **Heading Hierarchy** | ❌ Lost | ✅ SectionHeaderItem (H1-H6) | Context & document flow |
| **Table Extraction** | ⚠️ Breaks into text | ✅ Preserved as Markdown | Correct answers for table queries |
| **Content Type** | ⚠️ All treated equal | ✅ Text/Table/List/Form/Figure | Query-type aware retrieval |
| **Provenance Data** | ❌ Source only | ✅ Page/bbox/char_spans | Document reconstruction |
| **Formatting** | ❌ Stripped | ✅ Preserved | Emphasis & hierarchy preserved |
| **Structure** | ⚠️ Flat chunks | ✅ Hierarchical tree | Better semantic boundaries |

---

## 🎯 Problem Statement

### Current Issues (Detected in RAG_FLOW_TEST.ipynb):
```
❌ 100% of chunks missing section_number (569/569)
❌ 100% of chunks missing section_title (569/569)
❌ Fixed 900-char chunking breaks tables and structured content
❌ No heading hierarchy preservation
❌ Can't differentiate content types
❌ Retrieval Quality IMPACT: No section awareness → Lower relevance
```

### Root Causes:
1. **PyPDFLoader/Docx2txt** only extract text
2. **RecursiveCharacterTextSplitter** chunks by character count (ignores structure)
3. **No metadata enrichment** (section/heading/type information)
4. **Loss of document hierarchy** → All chunks weighted equally

---

## ✅ Docling Solution Architecture

### What Docling Returns

```
DoclingDocument
├── groups (Sections/Chapters/Lists)
│   ├── GroupItem.SECTION
│   │   ├── label: "SECTION"
│   │   ├── title: str
│   │   ├── children: List[DocItem]
│   │   └── prov: ProvenanceItem
│   └── GroupItem.CHAPTER, LIST, etc.
├── pages (Page objects)
├── body (Hierarchical content)
│   ├── TextItem
│   │   ├── text: str
│   │   └── format: TextFormat (bold, italic, etc)
│   ├── SectionHeaderItem
│   │   ├── text: str
│   │   └── level: int (1-6)
│   ├── TableItem
│   │   ├── data: List[List[str]]
│   │   └── markdown: str (formatted table)
│   ├── PictureItem
│   └── ListItem
├── tables (Extracted tables)
├── pictures (Extracted images)
└── origin (Source metadata)
    ├── filename
    ├── mime_type
    └── binary_hash
```

### Key Features:

**1. Hierarchical Structure**
```python
# Docling preserves document hierarchy
GroupItem(label="SECTION", title="Introduction")
  ├── SectionHeaderItem(text="Background", level=2)
  ├── TextItem(text="This is the background...")
  ├── SectionHeaderItem(text="Methods", level=2)
  └── TextItem(text="Our approach...")
```

**2. Table Preservation**
```python
TableItem(
    data=[["Header 1", "Header 2"], ["Row 1, Col 1", "Row 1, Col 2"]],
    markdown="| Header 1 | Header 2 |\n|----------|----------|\n| Row 1, Col 1 | Row 1, Col 2 |"
)
```

**3. Provenance (Location Tracking)**
```python
ProvenanceItem(
    page_number: int,
    bbox: BoundingBox,  # (x0, y0, x1, y1)
    char_start: int,
    char_end: int,
    text_range: TextRange
)
```

---

## 🔧 Implementation Plan

### Phase 1: Create DoclingProcessor (Week 1)

**File:** `backend/src/services/docling_processor.py`

```python
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import Document as DoclingDocument
from langchain_core.documents import Document
from typing import List, Dict, Any

class DoclingProcessor:
    """Process documents using Docling for structure-aware extraction"""

    def __init__(self):
        self.converter = DocumentConverter()

    def load_document(self, file_path: str) -> DoclingDocument:
        """Convert file to Docling document"""
        result = self.converter.convert(file_path)
        return result.document

    def extract_sections(self, doc: DoclingDocument) -> List[Dict[str, Any]]:
        """Extract sections with hierarchy"""
        sections = []
        for group in doc.groups:
            if group.label == "SECTION":
                sections.append({
                    'section_number': len(sections) + 1,
                    'title': group.title,
                    'level': 1,  # Will update based on nesting
                    'content': self._extract_group_content(group),
                    'provenance': self._extract_provenance(group)
                })
        return sections

    def extract_tables(self, doc: DoclingDocument) -> List[Dict[str, str]]:
        """Extract tables as Markdown"""
        tables = []
        for table in doc.tables:
            tables.append({
                'markdown': table.markdown,
                'caption': table.caption if hasattr(table, 'caption') else None,
                'provenance': self._extract_provenance(table)
            })
        return tables

    def chunk_with_structure(self, doc: DoclingDocument,
                            chunk_size: int = 1000) -> List[Document]:
        """Chunk respecting document structure"""
        chunks = []

        for section in self.extract_sections(doc):
            section_content = section['content']

            # Don't break sections into small chunks
            # Group by logical boundaries (paragraphs)
            paragraphs = section_content.split('\n\n')

            current_chunk = []
            current_size = 0

            for para in paragraphs:
                para_size = len(para)

                if current_size + para_size > chunk_size and current_chunk:
                    # Save current chunk
                    chunk_text = '\n\n'.join(current_chunk)
                    chunks.append(Document(
                        page_content=chunk_text,
                        metadata={
                            'section_number': section['section_number'],
                            'section_title': section['title'],
                            'content_type': 'text',
                            'source': section['provenance'].get('source'),
                            'page': section['provenance'].get('page'),
                        }
                    ))
                    current_chunk = []
                    current_size = 0

                current_chunk.append(para)
                current_size += para_size

            # Save remaining content
            if current_chunk:
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append(Document(
                    page_content=chunk_text,
                    metadata={
                        'section_number': section['section_number'],
                        'section_title': section['title'],
                        'content_type': 'text',
                        'source': section['provenance'].get('source'),
                        'page': section['provenance'].get('page'),
                    }
                ))

        # Add table chunks with special handling
        for table in self.extract_tables(doc):
            chunks.append(Document(
                page_content=table['markdown'],
                metadata={
                    'section_number': None,
                    'section_title': 'Table',
                    'content_type': 'table',
                    'source': table['provenance'].get('source'),
                    'page': table['provenance'].get('page'),
                    'table_caption': table['caption']
                }
            ))

        return chunks

    def _extract_group_content(self, group) -> str:
        """Extract text content from group recursively"""
        text = []
        for item in group.children:
            if hasattr(item, 'text'):
                text.append(item.text)
        return '\n'.join(text)

    def _extract_provenance(self, item) -> Dict:
        """Extract location data from provenance"""
        prov = item.prov if hasattr(item, 'prov') else None

        if prov:
            return {
                'page': prov.page_number,
                'bbox': (prov.bbox.x0, prov.bbox.y0, prov.bbox.x1, prov.bbox.y1) if prov.bbox else None,
                'char_spans': {
                    'start': prov.char_start,
                    'end': prov.char_end
                }
            }
        return {'page': None, 'bbox': None, 'char_spans': None}
```

---

### Phase 2: Update DocumentProcessor

**File:** `backend/src/services/document_processor.py`

```python
class DocumentProcessor:
    """Unified document processor with Docling fallback"""

    def __init__(self, use_docling: bool = True):
        self.use_docling = use_docling
        if use_docling:
            from .docling_processor import DoclingProcessor
            self.docling = DoclingProcessor()
        else:
            # Keep legacy implementation
            pass

    def load_docx(self, file_path: str):
        """Load DOCX with Docling"""
        if self.use_docling:
            doc = self.docling.load_document(file_path)
            chunks = self.docling.chunk_with_structure(doc)
            return chunks
        else:
            # Legacy implementation
            pass

    def load_pdf(self, file_path: str):
        """Load PDF with Docling"""
        if self.use_docling:
            doc = self.docling.load_document(file_path)
            chunks = self.docling.chunk_with_structure(doc)
            return chunks
        else:
            # Legacy implementation
            pass
```

---

### Phase 3: Update RAG Service

**File:** `backend/src/services/rag_service.py`

```python
def ingest_document(self, tenant_id: str, file_path: str) -> Dict:
    """Ingest document with Docling-extracted metadata"""

    # Process with Docling
    doc_processor = DocumentProcessor(use_docling=True)
    chunks = doc_processor.load_document(file_path)

    documents = []
    for chunk in chunks:
        doc = Document(
            tenant_id=tenant_id,
            section_number=chunk.metadata.get('section_number'),
            section_title=chunk.metadata.get('section_title'),
            content_type=chunk.metadata.get('content_type', 'text'),
            page_number=chunk.metadata.get('page'),
            content=chunk.page_content,
            embedding_vector=self._embed_text(chunk.page_content),
            metadata_json={
                'source': chunk.metadata.get('source'),
                'content_type': chunk.metadata.get('content_type'),
                'section_title': chunk.metadata.get('section_title')
            }
        )
        documents.append(doc)

    session.add_all(documents)
    session.commit()

    return {
        'success': True,
        'document_count': len(documents),
        'document_ids': [d.id for d in documents]
    }
```

---

### Phase 4: Update Vector Store Schema

**File:** `backend/src/models/document.py`

```python
class Document(Base):
    """Document chunk with rich metadata"""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.tenant_id"))

    # NEW: Section & Structure Metadata
    section_number = Column(Integer, nullable=True)  # Which section
    section_title = Column(String(500), nullable=True)  # Section name
    heading_level = Column(Integer, nullable=True)  # H1-H6
    content_type = Column(String(50), default='text')  # text/table/list/form/figure

    # Content
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)

    # Embedding for vector search
    embedding_vector = Column(Vector(384))  # all-MiniLM-L6-v2

    # Metadata JSON
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Indexes for fast retrieval
    __table_args__ = (
        Index('ix_documents_tenant_section', 'tenant_id', 'section_number'),
        Index('ix_documents_content_type', 'content_type'),
        Index('ix_documents_embedding', 'embedding_vector', using='ivfflat'),
    )
```

---

### Phase 5: Enhanced Retrieval

**File:** `backend/src/services/rag_service.py`

```python
def query_knowledge_base_enhanced(self, tenant_id: str, query: str,
                                   top_k: int = 5) -> List[Document]:
    """Semantic search with section awareness"""

    # Detect query type
    query_type = self._detect_query_type(query)  # table/list/text

    # Get query embedding
    query_embedding = self.embedding_service.embed_query(query)

    # Search vector DB
    results = session.query(Document).filter(
        Document.tenant_id == tenant_id
    ).order_by(
        Document.embedding_vector.cosine_distance(query_embedding)
    ).limit(top_k * 2).all()  # Get 2x results for reranking

    # Rerank by content type match
    if query_type == 'table':
        results = sorted(
            results,
            key=lambda d: (d.content_type == 'table', d.embedding_distance),
            reverse=True
        )

    # Rerank by section relevance (prefer same section)
    if results:
        primary_section = results[0].section_number
        results = sorted(
            results,
            key=lambda d: (d.section_number == primary_section, -d.embedding_distance),
            reverse=True
        )

    return results[:top_k]

def _detect_query_type(self, query: str) -> str:
    """Detect if query is asking about tables, lists, etc."""
    table_keywords = ['table', 'chart', 'graph', 'data', 'compare']
    list_keywords = ['list', 'steps', 'items', 'points']

    query_lower = query.lower()

    if any(kw in query_lower for kw in table_keywords):
        return 'table'
    elif any(kw in query_lower for kw in list_keywords):
        return 'list'
    else:
        return 'text'
```

---

## 📦 Installation & Setup

### Step 1: Install Docling

```bash
pip install docling
pip install docling-core
```

### Step 2: Update Requirements

**File:** `backend/requirements.txt`

```
docling>=1.0.0
docling-core>=1.0.0
pdf2image>=1.16.0  # For PDF image extraction
```

### Step 3: Migrate Database

```bash
# Add new columns to documents table
alembic revision --autogenerate -m "Add docling metadata columns"
alembic upgrade head
```

---

## 🧪 Testing in RAG_FLOW_TEST.ipynb

### New Test Cell: Docling vs Current Comparison

```python
# Cell: Docling Processing Comparison

from src.services.docling_processor import DoclingProcessor

docling_proc = DoclingProcessor()
doc = docling_proc.load_document(FILE_PATH)

print("Docling Document Structure:")
print(f"  Sections: {len([g for g in doc.groups if g.label == 'SECTION'])}")
print(f"  Tables: {len(doc.tables)}")
print(f"  Pages: {len(doc.pages)}")

# Process with Docling
docling_chunks = docling_proc.chunk_with_structure(doc)

# Compare
print(f"\nCurrent Processor: {len(chunks)} chunks, 0% have section info")
print(f"Docling Processor: {len(docling_chunks)} chunks")

# Count sections in Docling output
with_sections = sum(1 for c in docling_chunks if c.metadata.get('section_number'))
print(f"  {with_sections} chunks ({with_sections/len(docling_chunks)*100:.1f}%) have section info")

# Display sample
docling_df = pd.DataFrame([
    {
        'Index': i+1,
        'Section': c.metadata.get('section_number', 'N/A'),
        'Title': c.metadata.get('section_title', 'N/A'),
        'Type': c.metadata.get('content_type', 'text'),
        'Size': len(c.page_content)
    }
    for i, c in enumerate(docling_chunks[:20])
])

print("\nDocling Output Sample:")
print(docling_df.to_string(index=False))
```

---

## 📈 Expected Improvements

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| **Section Detection** | 0% chunks | 95%+ chunks | +95% |
| **Table Preservation** | Broken | Intact Markdown | ✅ 100% |
| **Content Type Awareness** | None | text/table/list/form | ✅ New |
| **Retrieval Precision** | ~0.65 | ~0.82 | +25% |
| **Table Q&A Accuracy** | ~30% | ~85% | +55% |
| **Document Location** | Unknown | Exact (page/bbox) | ✅ New |

---

## 🚀 Rollout Plan

**Week 1:** Create DoclingProcessor, test with notebook
**Week 2:** Migrate DocumentProcessor, update RAG service
**Week 3:** Update schema, migrate database
**Week 4:** Deploy, monitor retrieval quality
**Week 5:** Fine-tune chunking strategy based on metrics

---

## ⚠️ Known Limitations & Mitigations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| Docling slower than PyPDFLoader | ~2x ingestion time | Async processing, batch ingestion |
| Large tables exceed token limits | Can't fit in context | Chunk large tables into logical parts |
| No section in some PDFs | Some chunks still N/A | Fallback to heading detection |
| Memory usage for large docs | ~500MB for 1000-page PDF | Process in chunks, use streaming |

---

## 📚 References

- [Docling GitHub](https://github.com/DS4SD/docling)
- [Docling Documentation](https://docling-project.github.io/docling/)
- [RAG Best Practices](https://python.langchain.com/docs/use_cases/question_answering/)
