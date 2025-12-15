---
id: rag-flow
title: Flow RAG Agent
sidebar_position: 8
---

# Flow RAG Agent Chi Tiết
# Retrieval-Augmented Generation System

**Phiên bản:** 1.0
**Cập nhật lần cuối:** Tháng 12/2025

---

## Mục Lục
1. [Tổng Quan RAG System](#1-tổng-quan-rag-system)
2. [Flow Upload Document](#2-flow-upload-document)
3. [Flow Indexing & Embedding](#3-flow-indexing--embedding)
4. [Flow RAG Search](#4-flow-rag-search)
5. [Flow Integration với Agent](#5-flow-integration-với-agent)
6. [Flow Delete Document](#6-flow-delete-document)
7. [Advanced RAG Techniques](#7-advanced-rag-techniques)

---

## 1. Tổng Quan RAG System

### 1.1 Kiến Trúc RAG

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │         DOCUMENT INGESTION                      │         │
│  │  ┌──────────────┐  ┌──────────────┐           │         │
│  │  │ PDF Upload   │  │ DOCX Upload  │           │         │
│  │  └──────┬───────┘  └──────┬───────┘           │         │
│  │         │                  │                    │         │
│  │         ▼                  ▼                    │         │
│  │  ┌────────────────────────────────────┐        │         │
│  │  │      Text Extraction               │        │         │
│  │  │  - pypdf / python-docx             │        │         │
│  │  └──────────────┬─────────────────────┘        │         │
│  └─────────────────┼──────────────────────────────┘         │
│                    │                                          │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────┐         │
│  │         TEXT CHUNKING                           │         │
│  │  ┌──────────────────────────────────────┐      │         │
│  │  │ RecursiveCharacterTextSplitter       │      │         │
│  │  │ - chunk_size: 1000 chars             │      │         │
│  │  │ - chunk_overlap: 200 chars           │      │         │
│  │  │ - separators: ["\n\n", "\n", " "]    │      │         │
│  │  └──────────────┬───────────────────────┘      │         │
│  └─────────────────┼──────────────────────────────┘         │
│                    │                                          │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────┐         │
│  │         EMBEDDING GENERATION                    │         │
│  │  ┌──────────────────────────────────────┐      │         │
│  │  │ Model: sentence-transformers         │      │         │
│  │  │ - all-MiniLM-L6-v2                   │      │         │
│  │  │ - 384 dimensions                     │      │         │
│  │  │ - Fast & lightweight                 │      │         │
│  │  └──────────────┬───────────────────────┘      │         │
│  └─────────────────┼──────────────────────────────┘         │
│                    │                                          │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────┐         │
│  │         VECTOR STORAGE (pgvector)               │         │
│  │  ┌──────────────────────────────────────┐      │         │
│  │  │ PostgreSQL with pgvector extension   │      │         │
│  │  │ - VECTOR(384) data type              │      │         │
│  │  │ - IVFFlat index                      │      │         │
│  │  │ - Cosine similarity search           │      │         │
│  │  └──────────────────────────────────────┘      │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │         RETRIEVAL & RANKING                     │         │
│  │  ┌──────────────────────────────────────┐      │         │
│  │  │ 1. Query Embedding                   │      │         │
│  │  │ 2. Vector Similarity Search          │      │         │
│  │  │ 3. Tenant Filtering                  │      │         │
│  │  │ 4. Re-ranking (optional)             │      │         │
│  │  │ 5. Return top-k chunks               │      │         │
│  │  └──────────────────────────────────────┘      │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Database Schema cho RAG

```sql
-- Vector store table
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    content TEXT NOT NULL,

    -- Embedding vector (384 dimensions)
    embedding VECTOR(384),

    -- Metadata (JSONB for flexibility)
    metadata JSONB NOT NULL,
    -- {
    --   "tenant_id": "uuid",
    --   "source": "policy.pdf",
    --   "page_number": 3,
    --   "chunk_index": 5,
    --   "created_at": "2025-12-14T10:00:00Z",
    --   "document_id": "uuid",
    --   "section_title": "Chính sách đổi trả"
    -- }

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast retrieval
-- Vector similarity index (IVFFlat)
CREATE INDEX vector_embedding_idx
ON vector_store
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Tenant isolation index
CREATE INDEX idx_vector_tenant
ON vector_store ((metadata->>'tenant_id'));

-- Source tracking index
CREATE INDEX idx_vector_source
ON vector_store ((metadata->>'source'));

-- Document ID index
CREATE INDEX idx_vector_document
ON vector_store ((metadata->>'document_id'));

-- Full-text search index (optional, for hybrid search)
CREATE INDEX idx_vector_content_fts
ON vector_store
USING gin(to_tsvector('english', content));
```

---

## 2. Flow Upload Document

### 2.1 Sơ Đồ Upload Document

```
┌─────────┐                                           ┌─────────┐
│  Admin  │                                           │ Backend │
└────┬────┘                                           └────┬────┘
     │                                                      │
     │ [1] Admin navigate to Knowledge Base                │
     │     /admin/knowledge                                │
     │                                                      │
     │ [2] Click "Upload Document"                         │
     │     File picker hiển thị                            │
     │                                                      │
     │ [3] Select file và điền metadata                    │
     │     ┌─────────────────────────────────────┐         │
     │     │ File: policy.pdf (2.5 MB)          │         │
     │     │ Tenant: Công ty ABC                │         │
     │     │ Source Name: "Chính sách công ty"  │         │
     │     │ Category: Policies                 │         │
     │     │ Tags: [return, refund, warranty]   │         │
     │     └─────────────────────────────────────┘         │
     │                                                      │
     │ [4] Click "Upload"                                  │
     │     POST /api/admin/knowledge/upload                │
     │     Form-Data:                                      │
     │       file: <binary>                                │
     │       tenant_id: "abc-tenant-uuid"                  │
     │       metadata: {                                    │
     │         source: "Chính sách công ty",              │
     │         category: "Policies",                      │
     │         tags: ["return", "refund", "warranty"]     │
     │       }                                              │
     ├─────────────────────────────────────────────────────►
     │                                                      │
     │                        [5] VALIDATION                │
     │                            ├─ Check file type       │
     │                            │  (PDF, DOCX only)      │
     │                            ├─ Check file size       │
     │                            │  (\<100MB)              │
     │                            ├─ Check tenant exists   │
     │                            └─ Validate metadata     │
     │                                                      │
     │                        [6] SAVE FILE                 │
     │                            Save to:                  │
     │                            /uploads/{tenant_id}/     │
     │                              {document_id}.pdf       │
     │                                                      │
     │                        [7] CREATE DOCUMENT RECORD    │
     │                            INSERT INTO documents     │
     │                            (                         │
     │                              document_id,            │
     │                              tenant_id,              │
     │                              filename,               │
     │                              file_path,              │
     │                              file_size,              │
     │                              status = 'processing',  │
     │                              metadata                │
     │                            )                         │
     │                                                      │
     │ [8] Response (async processing)                     │
     │     {                                                │
     │       "document_id": "doc-uuid-123",                │
     │       "status": "processing",                       │
     │       "message": "Upload successful, processing..." │
     │     }                                                │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │                        [9] BACKGROUND PROCESSING     │
     │                            (Async task queue)        │
     │                            ↓                         │
     ▼                            ↓                         ▼
```

### 2.2 Code - Upload Handler

```python
# backend/src/api/knowledge.py
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import aiofiles
import os
import uuid
from src.services.rag_service import RAGService
from src.tasks.document_processing import process_document_async

router = APIRouter()

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    metadata: str = Form("{}"),  # JSON string
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Upload và index document vào knowledge base.

    Process:
    1. Validate file
    2. Save file to disk
    3. Create document record
    4. Queue async processing
    5. Return immediately
    """

    # [5] Validation
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            400,
            f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    # Check tenant exists
    tenant = db.query(Tenant).filter_by(tenant_id=tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Parse metadata
    try:
        metadata_dict = json.loads(metadata)
    except:
        metadata_dict = {}

    # [6] Save file
    document_id = uuid.uuid4()
    upload_dir = f"uploads/{tenant_id}"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/{document_id}{file_ext}"

    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    # [7] Create document record
    document = Document(
        document_id=document_id,
        tenant_id=tenant_id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        status='processing',  # Will be updated by async task
        metadata=metadata_dict
    )
    db.add(document)
    db.commit()

    # [9] Queue async processing
    # Using Celery or similar task queue
    task = process_document_async.delay(
        document_id=str(document_id),
        file_path=file_path,
        tenant_id=str(tenant_id)
    )

    logger.info(
        "document_uploaded",
        document_id=str(document_id),
        filename=file.filename,
        tenant_id=str(tenant_id),
        task_id=task.id
    )

    # [8] Return response
    return {
        "document_id": str(document_id),
        "status": "processing",
        "task_id": task.id,
        "message": "Upload successful. Processing in background."
    }
```

---

## 3. Flow Indexing & Embedding

### 3.1 Sơ Đồ Chi Tiết Indexing

```
Background Task: process_document_async
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: TEXT EXTRACTION                                     │
│                                                              │
│ Load file from disk: /uploads/{tenant_id}/{document_id}.pdf │
│                                                              │
│ ┌─────────────────────────────────────────────┐            │
│ │ IF PDF:                                      │            │
│ │   import pypdf                               │            │
│ │   reader = pypdf.PdfReader(file_path)        │            │
│ │   text = ""                                  │            │
│ │   for page_num, page in enumerate(reader.pages):         │
│ │     page_text = page.extract_text()          │            │
│ │     text += f"\n[Page {page_num+1}]\n"       │            │
│ │     text += page_text                        │            │
│ │                                              │            │
│ │ IF DOCX:                                     │            │
│ │   import docx                                │            │
│ │   doc = docx.Document(file_path)             │            │
│ │   text = ""                                  │            │
│ │   for para in doc.paragraphs:                │            │
│ │     text += para.text + "\n"                 │            │
│ └─────────────────────────────────────────────┘            │
│                                                              │
│ Extracted Text Example:                                     │
│ """                                                          │
│ [Page 1]                                                     │
│ CHÍNH SÁCH ĐỔI TRẢ SẢN PHẨM                                │
│                                                              │
│ 1. Điều kiện đổi trả                                        │
│ - Sản phẩm còn nguyên vẹn, chưa qua sử dụng                │
│ - Có hóa đơn mua hàng                                       │
│ - Trong vòng 30 ngày kể từ ngày mua                         │
│ ...                                                          │
│ """                                                          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: TEXT CHUNKING                                       │
│                                                              │
│ from langchain.text_splitter import RecursiveCharacterTextSplitter
│                                                              │
│ text_splitter = RecursiveCharacterTextSplitter(             │
│     chunk_size=1000,        # Max chars per chunk           │
│     chunk_overlap=200,      # Overlap between chunks        │
│     length_function=len,                                     │
│     separators=["\n\n", "\n", ". ", " ", ""]                │
│ )                                                            │
│                                                              │
│ chunks = text_splitter.split_text(extracted_text)           │
│                                                              │
│ Result:                                                      │
│ [                                                            │
│   {                                                          │
│     "content": "CHÍNH SÁCH ĐỔI TRẢ SẢN PHẨM\n\n1. Điều...",│
│     "chunk_index": 0,                                        │
│     "char_count": 987                                        │
│   },                                                         │
│   {                                                          │
│     "content": "...kiện đổi trả\n- Sản phẩm còn nguyên...", │
│     "chunk_index": 1,                                        │
│     "char_count": 1024                                       │
│   },                                                         │
│   ...                                                        │
│ ]                                                            │
│                                                              │
│ Total chunks: 15                                             │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: GENERATE EMBEDDINGS                                 │
│                                                              │
│ from sentence_transformers import SentenceTransformer       │
│                                                              │
│ # Load model (cached after first use)                       │
│ model = SentenceTransformer('all-MiniLM-L6-v2')             │
│                                                              │
│ embeddings = []                                              │
│ for chunk in chunks:                                         │
│     # Generate 384-dimensional embedding                     │
│     embedding = model.encode(                                │
│         chunk["content"],                                    │
│         convert_to_numpy=True,                               │
│         normalize_embeddings=True  # Cosine similarity       │
│     )                                                        │
│     embeddings.append(embedding)                             │
│                                                              │
│ Example embedding (first 10 dimensions):                    │
│ [0.123, -0.456, 0.789, -0.234, 0.567, ...]                  │
│ Total dimensions: 384                                        │
│                                                              │
│ Processing time: ~50ms per chunk                            │
│ Total time for 15 chunks: ~750ms                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: STORE IN PGVECTOR                                   │
│                                                              │
│ for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
│                                                              │
│   INSERT INTO vector_store (                                │
│     id,                                                      │
│     content,                                                 │
│     embedding,                                               │
│     metadata,                                                │
│     created_at                                               │
│   ) VALUES (                                                 │
│     gen_random_uuid(),                                       │
│     $1,  -- chunk["content"]                                │
│     $2,  -- embedding::vector(384)                          │
│     $3,  -- JSON metadata                                    │
│     NOW()                                                    │
│   )                                                          │
│                                                              │
│   Metadata for each chunk:                                  │
│   {                                                          │
│     "tenant_id": "abc-tenant-uuid",                         │
│     "document_id": "doc-uuid-123",                          │
│     "source": "Chính sách công ty",                         │
│     "filename": "policy.pdf",                               │
│     "chunk_index": i,                                        │
│     "total_chunks": len(chunks),                            │
│     "page_number": extracted_page_num,                      │
│     "category": "Policies",                                  │
│     "tags": ["return", "refund", "warranty"],               │
│     "created_at": "2025-12-14T10:00:00Z"                    │
│   }                                                          │
│                                                              │
│ Total inserts: 15 chunks                                    │
│ Batch insert for performance                                │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: UPDATE DOCUMENT STATUS                              │
│                                                              │
│ UPDATE documents SET                                         │
│   status = 'indexed',                                        │
│   chunks_count = 15,                                         │
│   processed_at = NOW(),                                      │
│   updated_at = NOW()                                         │
│ WHERE document_id = 'doc-uuid-123';                         │
│                                                              │
│ Log completion:                                              │
│ logger.info(                                                 │
│   "document_indexed",                                        │
│   document_id="doc-uuid-123",                               │
│   chunks_count=15,                                           │
│   processing_time_ms=2150                                    │
│ )                                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: NOTIFY ADMIN (Optional)                             │
│                                                              │
│ Send notification:                                           │
│ - Email: "Document 'policy.pdf' indexed successfully"       │
│ - WebSocket: Update UI in real-time                         │
│ - Slack: Post to #knowledge-base channel                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Code - Document Processing

```python
# backend/src/tasks/document_processing.py
from celery import shared_task
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import pypdf
import docx
from src.models.document import Document
from src.models.vector_store import VectorStore
from src.database import SessionLocal

# Load model globally (cached)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

@shared_task
def process_document_async(document_id: str, file_path: str, tenant_id: str):
    """
    Async task to process document:
    1. Extract text
    2. Chunk text
    3. Generate embeddings
    4. Store in pgvector
    """
    db = SessionLocal()

    try:
        # Get document record
        document = db.query(Document).filter_by(document_id=document_id).first()
        if not document:
            logger.error("Document not found", document_id=document_id)
            return

        # [STEP 1] Extract text
        if file_path.endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        elif file_path.endswith(('.docx', '.doc')):
            text = extract_text_from_docx(file_path)
        else:
            raise ValueError("Unsupported file type")

        logger.info(
            "text_extracted",
            document_id=document_id,
            text_length=len(text)
        )

        # [STEP 2] Chunk text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        chunks = text_splitter.split_text(text)

        logger.info(
            "text_chunked",
            document_id=document_id,
            chunks_count=len(chunks)
        )

        # [STEP 3 & 4] Generate embeddings and store
        vectors_inserted = 0

        for i, chunk_text in enumerate(chunks):
            # Generate embedding
            embedding = embedding_model.encode(
                chunk_text,
                convert_to_numpy=True,
                normalize_embeddings=True
            )

            # Prepare metadata
            metadata = {
                "tenant_id": tenant_id,
                "document_id": document_id,
                "source": document.metadata.get("source", document.filename),
                "filename": document.filename,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "category": document.metadata.get("category"),
                "tags": document.metadata.get("tags", []),
                "created_at": datetime.utcnow().isoformat()
            }

            # Insert into vector_store
            vector_record = VectorStore(
                content=chunk_text,
                embedding=embedding.tolist(),  # Convert numpy to list
                metadata=metadata
            )
            db.add(vector_record)
            vectors_inserted += 1

        # Commit all vectors
        db.commit()

        logger.info(
            "vectors_stored",
            document_id=document_id,
            vectors_count=vectors_inserted
        )

        # [STEP 5] Update document status
        document.status = 'indexed'
        document.chunks_count = len(chunks)
        document.processed_at = datetime.utcnow()
        db.commit()

        logger.info(
            "document_indexed",
            document_id=document_id,
            chunks_count=len(chunks)
        )

        return {
            "status": "success",
            "document_id": document_id,
            "chunks_count": len(chunks)
        }

    except Exception as e:
        logger.error(
            "document_processing_failed",
            document_id=document_id,
            error=str(e)
        )

        # Update document status to failed
        document.status = 'failed'
        document.error_message = str(e)
        db.commit()

        raise

    finally:
        db.close()


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file."""
    reader = pypdf.PdfReader(file_path)
    text = ""

    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text()
        text += f"\n[Page {page_num + 1}]\n"
        text += page_text

    return text


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file."""
    doc = docx.Document(file_path)
    text = ""

    for para in doc.paragraphs:
        text += para.text + "\n"

    return text
```

---

## 4. Flow RAG Search

### 4.1 Sơ Đồ Chi Tiết RAG Search

```
Agent needs context: "chính sách đổi trả sản phẩm"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ RAG TOOL EXECUTION                                           │
│                                                              │
│ Input:                                                       │
│   query: "chính sách đổi trả sản phẩm"                     │
│   tenant_id: "abc-tenant-uuid"                              │
│   top_k: 5                                                   │
│   min_similarity: 0.7                                        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: GENERATE QUERY EMBEDDING                            │
│                                                              │
│ from sentence_transformers import SentenceTransformer       │
│                                                              │
│ model = SentenceTransformer('all-MiniLM-L6-v2')             │
│ query_embedding = model.encode(                              │
│     "chính sách đổi trả sản phẩm",                          │
│     convert_to_numpy=True,                                   │
│     normalize_embeddings=True                                │
│ )                                                            │
│                                                              │
│ Result: [0.234, -0.567, 0.123, ..., 0.789]                  │
│ Dimensions: 384                                              │
│ Processing time: ~30ms                                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: VECTOR SIMILARITY SEARCH                            │
│                                                              │
│ SQL Query (using pgvector):                                 │
│                                                              │
│ SELECT                                                       │
│   id,                                                        │
│   content,                                                   │
│   metadata,                                                  │
│   1 - (embedding <=> $1::vector) AS similarity              │
│ FROM vector_store                                            │
│ WHERE                                                        │
│   -- Tenant isolation (CRITICAL!)                           │
│   metadata->>'tenant_id' = $2                               │
│   AND                                                        │
│   -- Similarity threshold filter                            │
│   1 - (embedding <=> $1::vector) >= $3                      │
│ ORDER BY                                                     │
│   embedding <=> $1::vector                                   │
│ LIMIT $4;                                                    │
│                                                              │
│ Parameters:                                                  │
│   $1 = query_embedding (vector)                             │
│   $2 = 'abc-tenant-uuid' (tenant_id)                        │
│   $3 = 0.7 (min_similarity)                                 │
│   $4 = 5 (top_k)                                            │
│                                                              │
│ Operator explanation:                                        │
│   <=> : Cosine distance operator                            │
│   1 - (distance) = similarity (0-1 range)                   │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: QUERY RESULTS                                        │
│                                                              │
│ [                                                            │
│   {                                                          │
│     "id": "chunk-uuid-1",                                   │
│     "content": "CHÍNH SÁCH ĐỔI TRẢ SẢN PHẨM\n\n1. Điều...",│
│     "similarity": 0.94,                                      │
│     "metadata": {                                            │
│       "tenant_id": "abc-tenant-uuid",                       │
│       "source": "Chính sách công ty",                       │
│       "filename": "policy.pdf",                             │
│       "page_number": 1,                                      │
│       "chunk_index": 0,                                      │
│       "category": "Policies"                                 │
│     }                                                        │
│   },                                                         │
│   {                                                          │
│     "id": "chunk-uuid-2",                                   │
│     "content": "Khách hàng có thể đổi trả sản phẩm trong...",│
│     "similarity": 0.89,                                      │
│     "metadata": { ... }                                      │
│   },                                                         │
│   {                                                          │
│     "id": "chunk-uuid-3",                                   │
│     "content": "Điều kiện đổi trả:\n- Sản phẩm còn...",    │
│     "similarity": 0.85,                                      │
│     "metadata": { ... }                                      │
│   },                                                         │
│   {                                                          │
│     "id": "chunk-uuid-4",                                   │
│     "content": "Thời hạn đổi trả: 30 ngày kể từ...",       │
│     "similarity": 0.78,                                      │
│     "metadata": { ... }                                      │
│   },                                                         │
│   {                                                          │
│     "id": "chunk-uuid-5",                                   │
│     "content": "Quy trình đổi trả:\n1. Liên hệ...",        │
│     "similarity": 0.73,                                      │
│     "metadata": { ... }                                      │
│   }                                                          │
│ ]                                                            │
│                                                              │
│ Query execution time: ~15ms (with index)                    │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: POST-PROCESSING (Optional)                          │
│                                                              │
│ A. Re-ranking with Cross-Encoder (Optional)                 │
│    from sentence_transformers import CrossEncoder           │
│    reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM')│
│                                                              │
│    scores = reranker.predict([                              │
│      (query, chunk["content"]) for chunk in results         │
│    ])                                                        │
│                                                              │
│    # Re-sort by new scores                                  │
│    results = sorted(                                         │
│      zip(results, scores),                                   │
│      key=lambda x: x[1],                                     │
│      reverse=True                                            │
│    )                                                         │
│                                                              │
│ B. Deduplicate Similar Chunks                               │
│    Remove chunks from same page/section if > 80% overlap    │
│                                                              │
│ C. Add Citation Information                                 │
│    for chunk in results:                                     │
│      chunk["citation"] = f"{chunk['filename']}, "           │
│                          f"page {chunk['page_number']}"     │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: FORMAT CONTEXT FOR LLM                              │
│                                                              │
│ context = ""                                                 │
│ for i, chunk in enumerate(results):                         │
│   context += f"\n--- Source {i+1} ---\n"                    │
│   context += f"From: {chunk['metadata']['source']}\n"       │
│   context += f"Relevance: {chunk['similarity']:.2f}\n"      │
│   context += f"\n{chunk['content']}\n"                      │
│                                                              │
│ Formatted Context:                                           │
│ """                                                          │
│ --- Source 1 ---                                             │
│ From: Chính sách công ty                                    │
│ Relevance: 0.94                                              │
│                                                              │
│ CHÍNH SÁCH ĐỔI TRẢ SẢN PHẨM                                │
│                                                              │
│ 1. Điều kiện đổi trả                                        │
│ - Sản phẩm còn nguyên vẹn, chưa qua sử dụng                │
│ - Có hóa đơn mua hàng                                       │
│ - Trong vòng 30 ngày kể từ ngày mua                         │
│                                                              │
│ --- Source 2 ---                                             │
│ From: Chính sách công ty                                    │
│ Relevance: 0.89                                              │
│                                                              │
│ Khách hàng có thể đổi trả sản phẩm trong vòng 30 ngày...   │
│ ...                                                          │
│ """                                                          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ RETURN TO AGENT                                              │
│                                                              │
│ {                                                            │
│   "tool_name": "RAG_TOOL",                                  │
│   "status": "success",                                       │
│   "context": "--- Source 1 ---\n...",                       │
│   "sources": [                                               │
│     {                                                        │
│       "filename": "policy.pdf",                             │
│       "page": 1,                                             │
│       "similarity": 0.94                                     │
│     },                                                       │
│     ...                                                      │
│   ],                                                         │
│   "metadata": {                                              │
│     "chunks_found": 5,                                       │
│     "query_time_ms": 45,                                     │
│     "top_similarity": 0.94,                                  │
│     "avg_similarity": 0.84                                   │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Code - RAG Search

```python
# backend/src/services/rag_service.py
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict
import numpy as np

class RAGService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

    def search(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 5,
        min_similarity: float = 0.7
    ) -> Dict:
        """
        Search knowledge base using vector similarity.

        Args:
            query: Search query
            tenant_id: Tenant ID for isolation
            top_k: Number of results to return
            min_similarity: Minimum similarity threshold

        Returns:
            Dict with context and metadata
        """
        start_time = time.time()

        # [STEP 1] Generate query embedding
        query_embedding = self.embedding_model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=True
        )

        # Convert to list for PostgreSQL
        embedding_list = query_embedding.tolist()

        # [STEP 2] Vector similarity search
        sql = text("""
            SELECT
                id,
                content,
                metadata,
                1 - (embedding <=> :query_embedding::vector) AS similarity
            FROM vector_store
            WHERE
                metadata->>'tenant_id' = :tenant_id
                AND 1 - (embedding <=> :query_embedding::vector) >= :min_similarity
            ORDER BY embedding <=> :query_embedding::vector
            LIMIT :top_k
        """)

        result = self.db.execute(
            sql,
            {
                "query_embedding": str(embedding_list),
                "tenant_id": tenant_id,
                "min_similarity": min_similarity,
                "top_k": top_k
            }
        )

        # [STEP 3] Process results
        chunks = []
        for row in result:
            chunks.append({
                "id": str(row.id),
                "content": row.content,
                "metadata": row.metadata,
                "similarity": float(row.similarity)
            })

        # [STEP 5] Format context
        context = self._format_context(chunks)

        query_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "rag_search_completed",
            tenant_id=tenant_id,
            query_length=len(query),
            chunks_found=len(chunks),
            query_time_ms=query_time_ms,
            top_similarity=chunks[0]["similarity"] if chunks else 0
        )

        return {
            "tool_name": "RAG_TOOL",
            "status": "success",
            "context": context,
            "sources": [
                {
                    "filename": chunk["metadata"].get("filename"),
                    "page": chunk["metadata"].get("page_number"),
                    "similarity": chunk["similarity"]
                }
                for chunk in chunks
            ],
            "metadata": {
                "chunks_found": len(chunks),
                "query_time_ms": query_time_ms,
                "top_similarity": chunks[0]["similarity"] if chunks else 0,
                "avg_similarity": np.mean([c["similarity"] for c in chunks]) if chunks else 0
            }
        }

    def _format_context(self, chunks: List[Dict]) -> str:
        """Format chunks into context string for LLM."""
        context = ""

        for i, chunk in enumerate(chunks):
            context += f"\n--- Source {i+1} ---\n"
            context += f"From: {chunk['metadata'].get('source', 'Unknown')}\n"
            context += f"Relevance: {chunk['similarity']:.2f}\n"
            context += f"\n{chunk['content']}\n"

        return context
```

---

## 5. Flow Integration với Agent

### 5.1 Sơ Đồ Tích Hợp RAG với Agent

```
User: "Chính sách đổi trả là gì?"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ DOMAIN AGENT (GuidelineAgent)                               │
│                                                              │
│ [1] Agent receives user question                            │
│                                                              │
│ [2] Check assigned tools:                                   │
│     Tools: [RAG_TOOL (priority 1), HTTP_TOOL (priority 2)]  │
│                                                              │
│ [3] Execute RAG_TOOL first (highest priority)               │
│     ↓                                                        │
│     Call RAGService.search(                                 │
│       query="Chính sách đổi trả là gì?",                   │
│       tenant_id="abc-tenant-uuid",                          │
│       top_k=5                                                │
│     )                                                        │
│     ↓                                                        │
│     Returns context with 5 relevant chunks                  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [4] BUILD LLM PROMPT WITH RAG CONTEXT                       │
│                                                              │
│ System Prompt:                                               │
│ """                                                          │
│ Bạn là chuyên gia tư vấn chính sách của công ty.           │
│ Trả lời câu hỏi dựa trên thông tin từ knowledge base.      │
│ Nếu thông tin không đủ, hãy nói rõ và yêu cầu làm rõ.      │
│ """                                                          │
│                                                              │
│ Context from RAG:                                            │
│ """                                                          │
│ --- Source 1 ---                                             │
│ From: Chính sách công ty                                    │
│ Relevance: 0.94                                              │
│                                                              │
│ CHÍNH SÁCH ĐỔI TRẢ SẢN PHẨM                                │
│ 1. Điều kiện đổi trả:                                       │
│ - Sản phẩm còn nguyên vẹn, chưa qua sử dụng                │
│ - Có hóa đơn mua hàng                                       │
│ - Trong vòng 30 ngày kể từ ngày mua                         │
│ ...                                                          │
│ """                                                          │
│                                                              │
│ Conversation History:                                        │
│ (Previous 5 messages if any)                                │
│                                                              │
│ User Question:                                               │
│ "Chính sách đổi trả là gì?"                                 │
│                                                              │
│ Assistant (generate answer based on context):                │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [5] LLM GENERATES ANSWER                                     │
│                                                              │
│ LLM Response:                                                │
│ """                                                          │
│ Chính sách đổi trả sản phẩm của chúng tôi như sau:         │
│                                                              │
│ 📋 **Điều kiện đổi trả:**                                    │
│ - Sản phẩm còn nguyên vẹn, chưa qua sử dụng                │
│ - Có hóa đơn mua hàng hợp lệ                                │
│ - Trong vòng 30 ngày kể từ ngày mua                         │
│                                                              │
│ ⏰ **Thời hạn:**                                              │
│ - 30 ngày kể từ ngày mua hàng                               │
│                                                              │
│ 📝 **Quy trình:**                                             │
│ 1. Liên hệ bộ phận CSKH                                     │
│ 2. Cung cấp hóa đơn và sản phẩm                             │
│ 3. Nhận xác nhận và hoàn tiền/đổi sản phẩm mới             │
│                                                              │
│ Bạn có câu hỏi cụ thể nào về quy trình đổi trả không?      │
│ """                                                          │
│                                                              │
│ Metadata:                                                    │
│ {                                                            │
│   "used_rag": true,                                          │
│   "rag_chunks_used": 5,                                      │
│   "top_similarity": 0.94,                                    │
│   "sources": ["policy.pdf page 1", "..."]                   │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [6] RETURN TO USER                                           │
│                                                              │
│ Display response with optional source citations:            │
│ """                                                          │
│ Chính sách đổi trả sản phẩm của chúng tôi như sau...       │
│                                                              │
│ ---                                                          │
│ 📚 Nguồn: Chính sách công ty (policy.pdf, trang 1)         │
│ """                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Flow Delete Document

### 6.1 Sơ Đồ Xóa Document

```
Admin muốn xóa document "policy.pdf"
    ↓
┌─────────────────────────────────────────────────────────────┐
│ [1] Admin clicks "Delete" on document                       │
│     Confirmation modal:                                      │
│     "Are you sure? This will delete all indexed chunks."    │
│                                                              │
│ [2] Admin confirms                                           │
│     DELETE /api/admin/knowledge/{document_id}               │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                           │
│                                                              │
│ [3] Get document record                                      │
│     SELECT * FROM documents WHERE document_id = ?           │
│                                                              │
│ [4] Delete all vector chunks                                │
│     DELETE FROM vector_store                                 │
│     WHERE metadata->>'document_id' = ?                      │
│                                                              │
│     (Example: deletes 15 chunks)                            │
│                                                              │
│ [5] Delete physical file                                     │
│     os.remove(document.file_path)                           │
│     # /uploads/abc-tenant/doc-uuid-123.pdf                  │
│                                                              │
│ [6] Delete document record                                   │
│     DELETE FROM documents WHERE document_id = ?             │
│                                                              │
│ [7] Log deletion                                             │
│     logger.info(                                             │
│       "document_deleted",                                    │
│       document_id=document_id,                               │
│       chunks_deleted=15,                                     │
│       deleted_by=current_user.user_id                        │
│     )                                                        │
│                                                              │
│ [8] Return success                                           │
│     {                                                        │
│       "status": "deleted",                                   │
│       "document_id": "doc-uuid-123",                        │
│       "chunks_deleted": 15                                   │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Advanced RAG Techniques

### 7.1 Hybrid Search (Vector + Keyword)

```python
def hybrid_search(query: str, tenant_id: str, top_k: int = 10):
    """
    Combine vector similarity with full-text search.

    Vector search: Good for semantic matching
    Keyword search: Good for exact matches (names, IDs, etc.)
    """

    # Vector search
    vector_results = rag_service.search(query, tenant_id, top_k=top_k)

    # Keyword search (PostgreSQL full-text search)
    keyword_results = db.execute(text("""
        SELECT
            id,
            content,
            metadata,
            ts_rank(to_tsvector('english', content), query) AS rank
        FROM vector_store,
             to_tsquery('english', :query) AS query
        WHERE
            to_tsvector('english', content) @@ query
            AND metadata->>'tenant_id' = :tenant_id
        ORDER BY rank DESC
        LIMIT :top_k
    """), {"query": query, "tenant_id": tenant_id, "top_k": top_k})

    # Merge and re-rank using Reciprocal Rank Fusion (RRF)
    combined = reciprocal_rank_fusion(vector_results, keyword_results)

    return combined[:top_k]
```

### 7.2 Query Expansion

```python
def expand_query(original_query: str) -> List[str]:
    """
    Expand query with synonyms and related terms.

    Example:
    "đổi trả" → ["đổi trả", "hoàn tiền", "trả hàng", "refund"]
    """

    expansion_prompt = f"""
    Generate 3 alternative phrasings for this query:
    "{original_query}"

    Return as JSON array.
    """

    llm_response = llm.generate(expansion_prompt)
    expanded_queries = json.loads(llm_response)

    return [original_query] + expanded_queries
```

### 7.3 Metadata Filtering

```python
def search_with_filters(
    query: str,
    tenant_id: str,
    filters: Dict,
    top_k: int = 5
):
    """
    Search with metadata filters.

    Example filters:
    {
      "category": "Policies",
      "tags": ["return", "refund"],
      "source": "policy.pdf"
    }
    """

    # Build WHERE clause dynamically
    where_clauses = ["metadata->>'tenant_id' = :tenant_id"]

    if "category" in filters:
        where_clauses.append("metadata->>'category' = :category")

    if "tags" in filters:
        where_clauses.append("metadata->'tags' ?| ARRAY[:tags]")

    if "source" in filters:
        where_clauses.append("metadata->>'source' = :source")

    where_clause = " AND ".join(where_clauses)

    sql = f"""
        SELECT ...
        FROM vector_store
        WHERE {where_clause}
        ORDER BY embedding <=> :query_embedding::vector
        LIMIT :top_k
    """

    # Execute with filters
    results = db.execute(sql, {
        "tenant_id": tenant_id,
        "query_embedding": query_embedding,
        **filters,
        "top_k": top_k
    })

    return results
```

---

## Tổng Kết

### RAG Flow Hoàn Chỉnh:

✅ **Upload**: PDF/DOCX → Text extraction → Validation
✅ **Indexing**: Chunking → Embedding generation → pgvector storage
✅ **Search**: Query embedding → Vector similarity → Tenant filtering → Top-k retrieval
✅ **Integration**: RAG context → LLM prompt → Generated answer
✅ **Delete**: Remove chunks → Remove file → Update database
✅ **Advanced**: Hybrid search, Query expansion, Metadata filtering

### Performance Metrics:

- **Upload**: ~2-3 seconds per document
- **Indexing**: ~50ms per chunk (15 chunks = ~750ms)
- **Search**: ~15-30ms with index
- **End-to-End**: \<500ms từ query đến context

### Best Practices:

1. **Chunk size**: 1000 chars với 200 overlap tối ưu
2. **Embedding model**: all-MiniLM-L6-v2 (nhanh, nhẹ, chính xác)
3. **Top-k**: 3-5 chunks cho hầu hết use cases
4. **Min similarity**: 0.7 threshold lọc noise
5. **Tenant isolation**: LUÔN filter theo tenant_id

**Trạng thái Tài liệu:** ✅ Hoàn thành
**Ngày Xem xét Tiếp theo:** Tháng 1/2026
