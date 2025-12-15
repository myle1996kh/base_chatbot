# WebSocket Refactor & SEE De-scope - Implementation Plan

> **Status**: Ready for approval
> **Date**: 2025-12-05
> **Based on**: Codebase exploration + 01-see-chat.md blueprint

---

## EXECUTIVE SUMMARY

This plan refactors the chat system from **SSE (Server-Sent Events)** to **WebSocket** for better real-time communication, and systematically removes SEE (escalation/supporter chat) features to reduce complexity.

**Total Scope**: ~2000+ lines of code changes across 20+ files (backend + frontend)

---

## PART A: WEBSOCKET MIGRATION (Phases 1-5)

### Phase 1: Event Bus (WebSocketEventBus) [CORE ABSTRACTION]

**Goal**: Decouple message creation from real-time broadcasting

#### 1.1 Create WebSocketEventBus Service
**File**: `backend/src/services/websocket.py` (NEW, ~250 lines)

**Design**: Centralized event bus that publishes all real-time events to WebSocket clients with clear, predictable event types.

```python
from typing import Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class RealtimeEventType(str, Enum):
    """All possible real-time event types"""
    MESSAGE_CREATED = "message_created"
    MESSAGE_DELETED = "message_deleted"
    SESSION_STATUS = "session_status"
    TYPING_INDICATOR = "typing_indicator"
    CONNECTION_READY = "connection_ready"

@dataclass
class MessageCreatedEvent:
    """Typed event for message creation"""
    tenant_id: str
    session_id: str
    message_id: str
    role: str  # "user" | "assistant" | "supporter" | "admin"
    content: str
    sender_user_id: Optional[str]
    created_at: str  # ISO8601
    client_message_id: Optional[str] = None
    metadata: Optional[dict] = None

    def to_dict(self):
        return {
            "type": RealtimeEventType.MESSAGE_CREATED,
            "tenant_id": self.tenant_id,
            "session_id": self.session_id,
            "message_id": self.message_id,
            "role": self.role,
            "content": self.content,
            "sender_user_id": self.sender_user_id,
            "created_at": self.created_at,
            "client_message_id": self.client_message_id,
            "metadata": self.metadata or {}
        }

class WebSocketEventBus:
    """
    Centralized event bus for WebSocket real-time events.
    Decouples event publishing from transport/storage logic.

    Event flow:
        API endpoint -> create message -> commit to DB -> publish_message_created()
        WebSocketEventBus -> broadcast to all WebSocket clients
    """

    def __init__(self, ws_manager: Optional['WebSocketManager'] = None):
        self.ws_manager = ws_manager

    def set_ws_manager(self, ws_manager: 'WebSocketManager'):
        """Set WebSocket manager after initialization"""
        self.ws_manager = ws_manager

    async def publish_message_created(self, event: MessageCreatedEvent) -> None:
        """
        Publish when a new message is created.

        Called from:
            - chat.py: when user/AI creates message
            - supporter.py: when supporter creates message
        """
        event_dict = event.to_dict()
        logger.info(
            f"Event {event.type}: session={event.session_id}, "
            f"role={event.role}, message_id={event.message_id}"
        )

        if self.ws_manager:
            await self.ws_manager.broadcast(
                event.tenant_id,
                event.session_id,
                event_dict
            )

    async def publish_typing_indicator(
        self,
        tenant_id: str,
        session_id: str,
        user_id: str,
        role: str,
        is_typing: bool = True
    ) -> None:
        """Publish typing indicator (user is typing...)"""
        event = {
            "type": RealtimeEventType.TYPING_INDICATOR,
            "tenant_id": tenant_id,
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "is_typing": is_typing
        }

        if self.ws_manager:
            await self.ws_manager.broadcast(tenant_id, session_id, event)

    async def publish_session_status(
        self,
        tenant_id: str,
        session_id: str,
        status: str  # "opened", "closed", "resolved"
    ) -> None:
        """Publish session status change"""
        event = {
            "type": RealtimeEventType.SESSION_STATUS,
            "tenant_id": tenant_id,
            "session_id": session_id,
            "status": status
        }

        if self.ws_manager:
            await self.ws_manager.broadcast(tenant_id, session_id, event)
```

#### 1.2 Register WebSocketEventBus in Dependency Injection
**File**: `backend/src/main.py` (MODIFY)

```python
from backend.src.services.websocket import WebSocketEventBus

# In startup event:
websocket_bus = WebSocketEventBus()  # ws_manager added in Phase 2
app.state.websocket_bus = websocket_bus
```

#### 1.3 Update Message Creation in Chat API
**File**: `backend/src/api/chat.py` (MODIFY, ~50 lines)

Add event publishing after creating AI messages:

```python
# After committing message to DB:
db.add(message)
db.commit()

# NEW: Publish real-time event
event = MessageCreatedEvent(
    tenant_id=str(tenant_id),
    session_id=str(session_id),
    message_id=str(message.message_id),
    role=message.role,
    content=message.content,
    sender_user_id=str(message.sender_user_id) if message.sender_user_id else None,
    created_at=message.created_at.isoformat(),
    client_message_id=request_body.get("client_message_id"),
    metadata=message.metadata
)

await request.app.state.websocket_bus.publish_message_created(event)
```

#### 1.4 Update Supporter Message Creation
**File**: `backend/src/api/supporter.py` (MODIFY, ~10 lines)

Replace direct SSE call with event bus:

```python
# BEFORE:
await sse_manager.broadcast_message(str(request.session_id), {...})

# AFTER:
event = MessageCreatedEvent(...)
await request.app.state.websocket_bus.publish_message_created(event)
```

#### Files Affected
- `backend/src/services/websocket.py` (NEW)
- `backend/src/api/chat.py` (MODIFY - add event publishing after message creation)
- `backend/src/api/supporter.py` (MODIFY - replace SSE broadcast with event bus)
- `backend/src/main.py` (MODIFY - instantiate and register websocket_bus)

---

### Phase 2: WebSocket Manager [REAL-TIME TRANSPORT]

#### 2.1 Create WebSocket Manager Service
**File**: `backend/src/services/websocket_manager.py` (NEW, ~300 lines)

```python
from typing import Dict, Set
from fastapi import WebSocket
import asyncio
import json

class WebSocketManager:
    """
    Manages WebSocket connections per tenant/session.
    Enforces connection limits per session/tenant and guards broadcast fan-out.

    Structure:
        connections = {
            f"{tenant_id}:{session_id}": Set[WebSocket]
        }
    """

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()
        self.max_per_session = 50
        self.max_per_tenant = 200

    def _get_key(self, tenant_id: str, session_id: str) -> str:
        return f"{tenant_id}:{session_id}"

    async def connect(self, tenant_id: str, session_id: str, websocket: WebSocket) -> None:
        """Register new WebSocket connection"""
        key = self._get_key(tenant_id, session_id)
        async with self.lock:
            tenant_total = sum(len(v) for k, v in self.active_connections.items() if k.startswith(f"{tenant_id}:"))
            if len(self.active_connections.get(key, set())) >= self.max_per_session or tenant_total >= self.max_per_tenant:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            if key not in self.active_connections:
                self.active_connections[key] = set()
            self.active_connections[key].add(websocket)
            logger.info(f"WS connected: {key}, total: {len(self.active_connections[key])}")

    async def disconnect(self, tenant_id: str, session_id: str, websocket: WebSocket) -> None:
        """Unregister WebSocket connection"""
        key = self._get_key(tenant_id, session_id)
        async with self.lock:
            if key in self.active_connections:
                self.active_connections[key].discard(websocket)
                if not self.active_connections[key]:
                    del self.active_connections[key]
                logger.info(f"WS disconnected: {key}")

    async def broadcast(
        self,
        tenant_id: str,
        session_id: str,
        event: dict
    ) -> None:
        """Broadcast event to all connected clients for this session"""
        key = self._get_key(tenant_id, session_id)
        async with self.lock:
            if key not in self.active_connections:
                return

            connections = list(self.active_connections[key])

        # Send outside lock to avoid blocking
        message = json.dumps(event)
        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send message to {key}: {e}")
                # Connection likely dead, will be cleaned up on next disconnect

    def get_connection_count(self, tenant_id: str, session_id: str) -> int:
        """Get number of active connections for a session"""
        key = self._get_key(tenant_id, session_id)
        return len(self.active_connections.get(key, set()))
```

#### 2.2 Create WebSocket Endpoint
**File**: `backend/src/api/ws.py` (NEW, ~300 lines)

```python
from fastapi import APIRouter, WebSocket, Query, status
from fastapi.exceptions import WebSocketException
from typing import Optional
import asyncio
import json

router = APIRouter()

@router.websocket("/ws/{tenant_id}/session/{session_id}")
async def session_ws(
    websocket: WebSocket,
    tenant_id: str,
    session_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time chat.

    Usage:
        ws://localhost:8000/ws/{tenant_id}/session/{session_id}?token={jwt_token}

    Message format (from client):
        {
            "type": "message" | "typing" | "read",
            "content": str,  # Only for "message" type
            "client_message_id": str  # Optional, for deduplication
        }

    Event format (to client):
        {
            "type": "message_created" | "session_status" | "typing",
            "tenant_id": str,
            "session_id": str,
            "message_id": str,
            "role": str,
            "content": str,
            "sender_user_id": str,
            "created_at": str,
            "client_message_id": str | None
        }
    """

    # 1. Authenticate token
    user_id, role = await authenticate_ws_token(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    allowed_staff_roles = {"admin", "supporter"}  # staff limited to admin/supporter
    if role not in allowed_staff_roles and role != "user":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Validate session exists
    db = get_db()
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.tenant_id == tenant_id
    ).first()

    if not session:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Check authorization (user owns session or is supporter/admin)
    if not is_authorized_for_session(user_id, role, session):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 4. Accept connection
    await websocket.accept()
    await websocket.state.websocket_bus.websocket_manager.connect(tenant_id, session_id, websocket)

    # 5. Send welcome event
    await websocket.send_json({
        "type": "connected",
        "message": "Connected to session",
        "session_id": session_id,
        "user_id": str(user_id),
        "role": role
    })

    # 6. Listen for incoming messages
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # Handle different message types
            if message_data.get("type") == "message":
                await handle_ws_message(
                    db=db,
                    tenant_id=tenant_id,
                    session_id=session_id,
                    user_id=user_id,
                    role=role,
                    content=message_data.get("content"),
                    client_message_id=message_data.get("client_message_id"),
                    websocket=websocket
                )

            elif message_data.get("type") == "typing":
                await websocket.state.websocket_bus.publish_typing_indicator({
                    "type": "typing",
                    "tenant_id": tenant_id,
                    "session_id": session_id,
                    "user_id": str(user_id),
                    "role": role
                })

    except Exception as e:
        logger.error(f"WebSocket error: {e}")

    finally:
        await websocket.state.websocket_bus.websocket_manager.disconnect(
            tenant_id, session_id, websocket
        )

async def handle_ws_message(db, tenant_id, session_id, user_id, role, content, client_message_id, websocket):
    """Handle incoming message from WebSocket client"""

    # 1. Validate message
    if not content or not content.strip():
        await websocket.send_json({"type": "error", "message": "Empty message"})
        return

    # 2. Create message in database
    try:
        message = Message(
            session_id=session_id,
            role=role,  # "user" for customers, "supporter" for staff
            content=content.strip(),
            sender_user_id=user_id if role != "user" else None,
            metadata={"client_message_id": client_message_id} if client_message_id else {}
        )
        db.add(message)
        db.commit()

        # 3. Publish event via websocket_bus
        await websocket.app.state.websocket_bus.publish_message_created({
            "type": "message_created",
            "tenant_id": tenant_id,
            "session_id": session_id,
            "message_id": str(message.message_id),
            "role": message.role,
            "content": message.content,
            "sender_user_id": str(message.sender_user_id) if message.sender_user_id else None,
            "created_at": message.created_at.isoformat(),
            "client_message_id": client_message_id,
            "metadata": message.metadata or {}
        })

        # 4. Send acknowledgement to sender
        await websocket.send_json({
            "type": "message_ack",
            "message_id": str(message.message_id),
            "client_message_id": client_message_id,
            "created_at": message.created_at.isoformat()
        })

    except Exception as e:
        logger.error(f"Failed to create message: {e}")
        await websocket.send_json({"type": "error", "message": "Failed to save message"})
```

#### 2.3 Update WebSocketEventBus with WebSocket Manager
**File**: `backend/src/services/websocket.py` (MODIFY)

```python
# In main.py startup, after creating WebSocketManager:
websocket_manager = WebSocketManager()
websocket_bus.set_ws_manager(websocket_manager)
```

#### 2.4 Register WebSocket Endpoint & Manager
**File**: `backend/src/main.py` (MODIFY)

```python
from backend.src.services.websocket_manager import WebSocketManager
from backend.src.api.ws import router as ws_router

# In startup event:
websocket_manager = WebSocketManager()
websocket_bus.set_ws_manager(websocket_manager)

app.state.websocket_manager = websocket_manager

# Include WebSocket router
app.include_router(ws_router, prefix="/api", tags=["websocket"])
```

#### Files Affected
- `backend/src/services/websocket_manager.py` (NEW)
- `backend/src/api/ws.py` (NEW)
- `backend/src/services/websocket.py` (MODIFY - set_ws_manager)
- `backend/src/main.py` (MODIFY - register WebSocketManager & route)

---

### Phase 3: Frontend WebSocket Hook [CLIENT REAL-TIME]

#### 3.1 Create useSessionChannel Hook
**File**: `frontend/src/hooks/useSessionChannel.ts` (NEW, ~300 lines)

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

interface UseSessionChannelParams {
  tenantId: string;
  sessionId: string;
  token: string;
  onEvent: (event: any) => void;
  enabled?: boolean;
}

interface WebSocketStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
  retryCount?: number;
}

export function useSessionChannel({
  tenantId,
  sessionId,
  token,
  onEvent,
  enabled = true
}: UseSessionChannelParams) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const [status, setStatus] = useState<WebSocketStatus>({ status: 'disconnected' });

  const connect = useCallback(() => {
    if (!enabled) return;

    setStatus({ status: 'connecting', retryCount: retryCountRef.current });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/${tenantId}/session/${sessionId}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setStatus({ status: 'connected' });
        retryCountRef.current = 0;
        onEvent({ type: 'ws_connected' });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus({ status: 'error', error: 'Connection error' });
      };

      ws.onclose = () => {
        setStatus({ status: 'disconnected' });
        wsRef.current = null;

        // Reconnect with backoff
        if (enabled && retryCountRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setStatus({ status: 'error', error: 'Failed to create WebSocket' });
    }
  }, [tenantId, sessionId, token, onEvent, enabled]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, tenantId, sessionId, token]);

  return {
    status,
    send,
    close
  };
}
```

#### 3.2 Update ChatWidget Component
**File**: `frontend/src/components/ChatWidget.tsx` (MODIFY, ~100 lines)

```typescript
// Replace EventSource logic with useSessionChannel hook

const ChatWidget: React.FC<ChatWidgetProps> = ({ sessionId, tenantId, token }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Map<string, Message>>(new Map());

  const handleEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'message_created':
        // If message has client_message_id, it's a confirmation of pending message
        if (event.client_message_id) {
          setPendingMessages(prev => {
            const updated = new Map(prev);
            updated.delete(event.client_message_id);
            return updated;
          });
        }
        // Add/update message
        setMessages(prev => {
          const existing = prev.find(m => m.message_id === event.message_id);
          if (existing) return prev;
          return [...prev, {
            message_id: event.message_id,
            role: event.role,
            content: event.content,
            created_at: event.created_at
          }];
        });
        break;

      case 'typing':
        // Handle typing indicator
        handleTypingIndicator(event);
        break;
    }
  }, []);

  const { status, send } = useSessionChannel({
    tenantId,
    sessionId,
    token,
    onEvent: handleEvent,
    enabled: !!token
  });

  const sendMessage = useCallback((content: string) => {
    const clientMessageId = generateUUID();

    // Add optimistic message
    setPendingMessages(prev => new Map(prev).set(clientMessageId, {
      message_id: clientMessageId,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }));

    // Send via WebSocket
    send({
      type: 'message',
      content,
      client_message_id: clientMessageId
    });
  }, [send]);

  return (
    <div className="chat-widget">
      <MessageList messages={[...messages, ...Array.from(pendingMessages.values())]} />
      <MessageInput onSend={sendMessage} disabled={status.status !== 'connected'} />
    </div>
  );
};
```

#### 3.3 Update ChatRoomPage (Supporter)
**File**: `frontend/src/pages/ChatRoomPage.tsx` (MODIFY, ~150 lines)

Replace EventSource with useSessionChannel hook. Similar pattern to ChatWidget.

#### Files Affected
- `frontend/src/hooks/useSessionChannel.ts` (NEW)
- `frontend/src/components/ChatWidget.tsx` (MODIFY)
- `frontend/src/pages/ChatRoomPage.tsx` (MODIFY)
- `frontend/src/pages/SupportDashboard.tsx` (MODIFY - keep SSE for session list or migrate too)
- `frontend/src/components/EmbeddedWidget.tsx` (MODIFY)

---

### Phase 4: Refactor UI Message Handling [CONSISTENCY]

#### 4.1 Update Message Submission Flow

**Current (problematic)**:
- User sends message
- Frontend appends to UI immediately from HTTP response
- Later, SSE event comes (duplicate)

**New (correct)**:
- User sends message
- Frontend adds "pending" message with `client_message_id`
- WebSocket server confirms with `message_ack`
- Frontend replaces pending with real message on `message_created` event

#### 4.2 Remove Optimistic Updates from HTTP Response
**File**: `frontend/src/services/chatService.ts` (MODIFY)

```typescript
// BEFORE: message = await chatService.sendMessage(...)
//         setMessages([...messages, message])  // ❌ Duplicate

// AFTER:  chatService.sendMessage(...)  // Just send, don't add to UI
//         Wait for WebSocket message_created event
```

#### 4.3 Add Message Deduplication
**File**: `frontend/src/hooks/useSessionChannel.ts` (UPDATE)

```typescript
// Deduplicate by message_id to avoid double rendering
const messagesMap = new Map();
messages.forEach(m => messagesMap.set(m.message_id, m));
const uniqueMessages = Array.from(messagesMap.values());
```

#### Files Affected
- `frontend/src/services/chatService.ts` (MODIFY)
- `frontend/src/components/shared/MessageList.tsx` (MODIFY - deduplication)
- `frontend/src/pages/ChatRoomPage.tsx` (MODIFY)
- `frontend/src/pages/admin/ChatManagementPage.tsx` (MODIFY)

---

### Phase 5: Migration & Rollback Strategy [DEPLOYMENT]

#### 5.1 Backward Compatibility
- Keep SSE endpoints working during migration
- Both SSE and WS transport simultaneously via `REALTIME_TRANSPORT=ws,sse`
- Monitor for issues, fall back to SSE if needed

#### 5.2 Deployment Steps
1. **Staging (Day 1)**
   - Deploy Phase 0-2 backend changes
   - Enable WebSocket endpoint but NO frontend migration yet
   - Test WS endpoint with admin tools
   - Keep SSE as primary

2. **Staging (Day 2)**
   - Deploy Phase 3-4 frontend changes
   - Enable WS for admin/supporter dashboard first
   - Monitor error rates, performance
   - If issues: Keep SSE as fallback

3. **Production (Day 3)**
   - Enable WS for widget (most sessions)
   - Maintain SSE fallback
   - Monitor logs: WebSocket connections, reconnects, errors

4. **Production (Day 4+)**
   - If stable: Disable SSE (remove from code) - see Phase 5B
   - Keep WS-only indefinitely

#### 5.3 Success Metrics
- WebSocket connection success rate > 95%
- Message delivery latency < 100ms (vs SSE ~500ms)
- Reconnect time < 2 seconds
- No duplicate messages in UI
- No "connection lost" user complaints

#### 5.4 Rollback Plan
- If WebSocket unstable: `REALTIME_TRANSPORT=sse` (revert frontend to SSE)
- If message duplication: Check client deduplication logic
- If high CPU: Check WebSocket connection limits, broadcast logic

---

## PART B: SEE DE-SCOPE (Phases A-D)

> **AFTER WebSocket is stable.** Running both changes together increases risk.

### Phase A: Freeze SEE Development [GOVERNANCE]

#### A.1 Code Freeze
- No new escalation/supporter features
- Treat as "legacy / deprecated"
- Document all SEE APIs in Swagger as "Deprecated"

#### A.2 Mark Deprecated
**Files to update** (add docstring/comment):
- `backend/src/services/escalation_service.py` - Top-level comment: "Deprecated - escalation features being removed"
- `backend/src/api/chat.py` - Comment on `public_escalate_session` endpoint
- `backend/src/api/supporter.py` - Comment on all endpoints: "Deprecated"
- `frontend/src/services/escalationService.ts` - Comment: "Deprecated - escalation features being removed"

#### Files Affected
- Multiple files (comments only, no code changes)

---

### Phase B: Disable SEE on Frontend [USER-FACING REMOVAL]

#### B.1 Remove Escalation UI from Chat Widget
**File**: `frontend/src/components/ChatWidget.tsx` (MODIFY)

```typescript
// BEFORE: {showEscalationButton && <EscalationButton />}
// AFTER: {/* Escalation removed */}
```

Remove:
- Escalation button/dialog
- Escalation reason input
- Escalation status display

#### B.2 Disable Escalation in SupportDashboard
**File**: `frontend/src/pages/SupportDashboard.tsx` (MODIFY)

```typescript
// Hide escalation queue tab or remove completely
// Hide "Request Support" button for admins
// Remove escalation status filters
```

#### B.3 Remove Escalation Page
**File**: `frontend/src/pages/admin/EscalationQueuePage.tsx` (DELETE)

- Remove route from `App.tsx` or `/routes`
- Remove from admin sidebar navigation

#### B.4 Update Routing
**File**: `frontend/src/App.tsx` (MODIFY)

```typescript
// REMOVE: <Route path="/admin/escalations" component={EscalationQueuePage} />
// REMOVE: <Route path="/support" component={SupportDashboard} />  // Or keep if needed for other features
```

#### B.5 Stop Calling Escalation APIs
**File**: `frontend/src/services/escalationService.ts` (MODIFY or DELETE)

```typescript
// Option 1: Keep file but make functions return 501 Not Implemented
// Option 2: Delete entire file and remove all imports

// Remove all calls to:
// - escalateSessionPublic()
// - getEscalationQueue()
// - assignSupporter()
// - resolveEscalation()
```

#### Files Affected
- `frontend/src/components/ChatWidget.tsx` (MODIFY)
- `frontend/src/components/EmbeddedWidget.tsx` (MODIFY)
- `frontend/src/components/shared/EscalationDialog.tsx` (DELETE)
- `frontend/src/pages/SupportDashboard.tsx` (MODIFY or DELETE)
- `frontend/src/pages/admin/EscalationQueuePage.tsx` (DELETE)
- `frontend/src/services/escalationService.ts` (DELETE)
- `frontend/src/App.tsx` (MODIFY - remove routes)
- `frontend/src/types.ts` (MODIFY - remove escalation types)

---

### Phase C: Disable SEE on Backend [API REMOVAL]

#### C.1 Disable Escalation Endpoints
**File**: `backend/src/api/chat.py` (MODIFY)

```python
# BEFORE:
@router.post("/{tenant_id}/session/{session_id}/escalate")
async def public_escalate_session(...):
    ...

# AFTER: Return 410 Gone
@router.post("/{tenant_id}/session/{session_id}/escalate")
async def public_escalate_session(...):
    raise HTTPException(
        status_code=410,
        detail="Escalation feature has been removed. Please contact support directly."
    )
```

Or completely remove the endpoint (riskier, but cleaner).

#### C.2 Disable Supporter Endpoints
**File**: `backend/src/api/supporter.py` (MODIFY)

Option 1: Return 410 for all endpoints
```python
@router.get("/tenants/{tenant_id}/supporters/{supporter_id}/sessions")
async def get_supporter_sessions(...):
    raise HTTPException(status_code=410, detail="Feature removed")

@router.post("/tenants/{tenant_id}/supporter-chat")
async def send_supporter_message(...):
    raise HTTPException(status_code=410, detail="Feature removed")
```

Option 2: Keep functional but disable in code review (safer)
```python
# DEPRECATED - Can be removed after migration complete
# Currently unused - no UI calls these endpoints
```

#### C.3 Disable Admin Escalation Endpoints
**File**: `backend/src/api/admin/escalation.py` (MODIFY or DELETE)

```python
# Option 1: Mark all endpoints as disabled
# Option 2: Delete file if completely unused
```

Check if any admin functionality depends on escalation management. If not, can delete.

#### C.4 Keep DB Fields (No Migration)
**File**: `backend/src/models/session.py` (NO CHANGE)

Keep these fields in the model to avoid database migration:
```python
assigned_user_id: UUID = None
escalation_status: str = 'none'
escalation_reason: str = None
escalation_requested_at: datetime = None
escalation_assigned_at: datetime = None
```

Don't expose in API responses via schema.

#### C.5 Update Escalation Service Status
**File**: `backend/src/services/escalation_service.py` (MODIFY)

Add top-level docstring:
```python
"""
DEPRECATED - Escalation features are being removed.

This module is no longer called by the API or UI.
Kept for reference during transition period.
Can be deleted after confirming no other code depends on it.

Migration path: All escalation support is now handled via WebSocket messaging.
End-users can contact support directly instead of escalating.
"""
```

Keep the code but mark as unused.

#### Files Affected
- `backend/src/api/chat.py` (MODIFY - disable escalate endpoint)
- `backend/src/api/supporter.py` (MODIFY - disable or return 410)
- `backend/src/api/admin/escalation.py` (MODIFY or DELETE)
- `backend/src/services/escalation_service.py` (MODIFY - add deprecated notice)

---

### Phase D: Code & Docs Cleanup [MAINTENANCE]

#### D.1 Code Cleanup - Grep Search
Search for all references to escalation/supporter code:

```bash
# Find all mentions
rg "escalat" --type py --type tsx --type ts
rg "supporter" --type py --type tsx --type ts
rg "assigned_user" --type py --type tsx --type ts
rg "escalation_status" --type py --type tsx --type ts
```

**For each match:**
- If in API/UI: Already handled in Phase B/C, should be deleted/disabled
- If in comment: Update docstring
- If in log message: Clarify it's legacy
- If in test: Consider deleting if test is for escalation only

#### D.2 Remove Unused Imports
**Files to check**:
- `backend/src/main.py` - Check if imports `escalation_service`
- `backend/src/api/supporter.py` - Check imports of escalation modules
- `frontend/src/App.tsx` - Check if imports EscalationQueuePage
- `frontend/src/services/index.ts` - Remove escalationService export

#### D.3 Update Database Models
**File**: `backend/src/models/session.py` (OPTIONAL - do after Phase C is complete)

If 100% confident escalation won't be needed:
- Create Alembic migration to drop columns: `assigned_user_id`, `escalation_status`, `escalation_reason`, `escalation_requested_at`, `escalation_assigned_at`
- Update model to remove fields
- **But**: For now, SKIP THIS - keep fields to allow rollback

#### D.4 Update Documentation
**Files to update**:
- `docs/01-see-chat.md` - Update "Current Status: Escalation features have been removed in Phase D (date)"
- `docs/02-implementation-plan.md` - Mark phases as completed with dates
- `README.md` - If mentioning escalation: Remove or mark as deprecated
- Swagger/OpenAPI docs - Mark escalation endpoints as deprecated/removed

#### D.5 Test Coverage
**Regression Tests to Run**:
- ✅ User can send message (no escalation button shown)
- ✅ Supporter can send message via WebSocket
- ✅ Admin dashboard loads without escalation queue
- ✅ API returns 410 for escalate endpoint
- ✅ No 404 errors from removed escalation pages
- ✅ WebSocket reconnect works after network interruption

#### Files Affected
- Multiple (comments, cleanup, docs)
- `backend/src/main.py` (MODIFY - remove imports if any)
- `docs/01-see-chat.md` (MODIFY - update status)
- `docs/02-implementation-plan.md` (UPDATE - mark completed phases)
- `README.md` (MODIFY - remove escalation references)
- Test files (MODIFY - remove escalation-specific tests)

---

## SUMMARY: File Changes by Phase

### Phase 1 (WebSocketEventBus)
- `backend/src/services/websocket.py` - NEW
- `backend/src/api/chat.py` - MODIFY (~50 lines)
- `backend/src/api/supporter.py` - MODIFY (~10 lines)
- `backend/src/main.py` - MODIFY (~20 lines)

### Phase 2 (WebSocket Manager)
- `backend/src/services/websocket_manager.py` - NEW
- `backend/src/api/ws.py` - NEW
- `backend/src/services/websocket.py` - MODIFY
- `backend/src/main.py` - MODIFY

### Phase 3 (Frontend Hook)
- `frontend/src/hooks/useSessionChannel.ts` - NEW
- `frontend/src/components/ChatWidget.tsx` - MODIFY
- `frontend/src/pages/ChatRoomPage.tsx` - MODIFY
- `frontend/src/components/EmbeddedWidget.tsx` - MODIFY

### Phase 4 (Message Handling)
- `frontend/src/services/chatService.ts` - MODIFY
- `frontend/src/components/shared/MessageList.tsx` - MODIFY
- `frontend/src/pages/ChatRoomPage.tsx` - MODIFY
- `frontend/src/pages/admin/ChatManagementPage.tsx` - MODIFY

### Phase A (Freeze)
- Multiple files - Comments only

### Phase B (Frontend Removal)
- `frontend/src/components/ChatWidget.tsx` - MODIFY
- `frontend/src/components/EmbeddedWidget.tsx` - MODIFY
- `frontend/src/components/shared/EscalationDialog.tsx` - DELETE
- `frontend/src/pages/SupportDashboard.tsx` - MODIFY/DELETE
- `frontend/src/pages/admin/EscalationQueuePage.tsx` - DELETE
- `frontend/src/services/escalationService.ts` - DELETE
- `frontend/src/App.tsx` - MODIFY

### Phase C (Backend Removal)
- `backend/src/api/chat.py` - MODIFY
- `backend/src/api/supporter.py` - MODIFY
- `backend/src/api/admin/escalation.py` - MODIFY/DELETE
- `backend/src/services/escalation_service.py` - MODIFY

### Phase D (Cleanup)
- Multiple files - Comments, imports, docs

---

## RECOMMENDED EXECUTION ORDER

1. **Phase 1**: WebSocketEventBus (event bus foundation)
   - Low risk, foundation for WebSocket
   - Decouples event publishing from transport

2. **Phase 2**: WebSocket Manager & Endpoint
   - Core infrastructure, careful testing needed
   - Server-side real-time transport

3. **Phase 3-4**: Frontend WebSocket Hook & Message Handling
   - Client-side real-time integration
   - Remove SSE EventSource references

4. **Phase 5**: Deployment & Monitoring
   - Staged rollout, monitor stability

5. **Phase A-D**: De-scope SEE (escalation/supporter)
   - Only after WebSocket is proven stable in production

---

## APPROVAL CHECKLIST

Before starting implementation, confirm:

- ✅ Remove Phase 0 (no separate config setup needed)
- ✅ Use `WebSocketEventBus` with strong typing (Enum event types, dataclass events)
- ✅ Proceed with full scope (Phases 1-5 + A-D)?
- ✅ Or focus on WebSocket first (Phases 1-5), defer SEE removal?
- ❓ Any custom escalation logic I missed?
- ❓ Any supporter chat integrations to other systems?
- ❓ Timeline constraints or deployment windows?
- ❓ Ready to start Phase 1 implementation?
