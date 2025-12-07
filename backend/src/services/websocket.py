"""WebSocket event bus for real-time events."""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from src.services.websocket_manager import websocket_manager, WebSocketManager
from src.utils.logging import get_logger

logger = get_logger(__name__)


class RealtimeEventType(str, Enum):
    MESSAGE_CREATED = "message_created"
    SESSION_STATUS = "session_status"
    TYPING_INDICATOR = "typing_indicator"
    CONNECTION_READY = "connection_ready"


@dataclass
class MessageCreatedEvent:
    tenant_id: str
    session_id: str
    message_id: str
    role: str  # "user" | "assistant" | "supporter" | "admin"
    content: str
    sender_user_id: Optional[str]
    created_at: str  # ISO8601
    client_message_id: Optional[str] = None
    metadata: Optional[dict] = None

    def to_dict(self) -> Dict[str, Any]:
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
            "metadata": self.metadata or {},
        }


class WebSocketEventBus:
    """Centralized event bus for WebSocket real-time events."""

    def __init__(self, ws_manager: Optional[WebSocketManager] = None):
        self.ws_manager = ws_manager or websocket_manager

    def set_ws_manager(self, ws_manager: WebSocketManager) -> None:
        self.ws_manager = ws_manager

    async def publish_message_created(self, event: MessageCreatedEvent) -> None:
        """Publish when a new message is created."""
        event_dict = event.to_dict()
        logger.info(
            "ws_event_message_created",
            tenant_id=event.tenant_id,
            session_id=event.session_id,
            message_id=event.message_id,
            role=event.role,
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
        is_typing: bool = True,
    ) -> None:
        """Publish typing indicator."""
        event = {
            "type": RealtimeEventType.TYPING_INDICATOR,
            "tenant_id": tenant_id,
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "is_typing": is_typing,
        }

        if self.ws_manager:
            await self.ws_manager.broadcast(tenant_id, session_id, event)

    async def publish_session_status(
        self,
        tenant_id: str,
        session_id: str,
        status: str,
    ) -> None:
        """Publish session status change."""
        event = {
            "type": RealtimeEventType.SESSION_STATUS,
            "tenant_id": tenant_id,
            "session_id": session_id,
            "status": status,
        }

        if self.ws_manager:
            await self.ws_manager.broadcast(tenant_id, session_id, event)


# Shared singleton
websocket_bus = WebSocketEventBus()
