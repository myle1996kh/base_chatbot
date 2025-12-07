"""WebSocket connection manager with basic connection limits."""

import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket
from src.utils.logging import get_logger

logger = get_logger(__name__)


class WebSocketManager:
    """Manages WebSocket connections per tenant/session with limits."""

    def __init__(self, max_per_session: int = 50, max_per_tenant: int = 200):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()
        self.max_per_session = max_per_session
        self.max_per_tenant = max_per_tenant

    def _key(self, tenant_id: str, session_id: str) -> str:
        return f"{tenant_id}:{session_id}"

    async def connect(self, tenant_id: str, session_id: str, websocket: WebSocket) -> bool:
        """
        Register a WebSocket connection. Returns False if limits exceeded.
        Caller should close the socket when False.
        """
        key = self._key(tenant_id, session_id)
        async with self.lock:
            tenant_total = sum(
                len(v) for k, v in self.active_connections.items()
                if k.startswith(f"{tenant_id}:")
            )
            session_count = len(self.active_connections.get(key, set()))

            if session_count >= self.max_per_session or tenant_total >= self.max_per_tenant:
                logger.warning(
                    "ws_connection_limit_reached",
                    tenant_id=tenant_id,
                    session_id=session_id,
                    session_count=session_count,
                    tenant_total=tenant_total,
                    max_per_session=self.max_per_session,
                    max_per_tenant=self.max_per_tenant,
                )
                return False

            if key not in self.active_connections:
                self.active_connections[key] = set()
            self.active_connections[key].add(websocket)
            logger.info(
                "ws_connected",
                tenant_id=tenant_id,
                session_id=session_id,
                session_connections=len(self.active_connections[key]),
                tenant_connections=tenant_total + 1,
            )
            return True

    async def disconnect(self, tenant_id: str, session_id: str, websocket: WebSocket) -> None:
        """Unregister a WebSocket connection."""
        key = self._key(tenant_id, session_id)
        async with self.lock:
            if key in self.active_connections:
                self.active_connections[key].discard(websocket)
                if not self.active_connections[key]:
                    del self.active_connections[key]
                logger.info(
                    "ws_disconnected",
                    tenant_id=tenant_id,
                    session_id=session_id,
                    remaining=len(self.active_connections.get(key, [])),
                )

    async def broadcast(self, tenant_id: str, session_id: str, event: dict) -> None:
        """Broadcast an event to all connections for a tenant/session."""
        key = self._key(tenant_id, session_id)
        async with self.lock:
            connections = list(self.active_connections.get(key, set()))

        if not connections:
            return

        message = json.dumps(event)
        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.error(
                    "ws_broadcast_failed",
                    tenant_id=tenant_id,
                    session_id=session_id,
                    error=str(e),
                )
                # Let disconnect cleanup happen elsewhere

    def get_connection_count(self, tenant_id: str, session_id: str) -> int:
        """Return number of active connections for a session."""
        return len(self.active_connections.get(self._key(tenant_id, session_id), set()))


# Shared singleton
websocket_manager = WebSocketManager()
