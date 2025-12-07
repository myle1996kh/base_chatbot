"""WebSocket endpoints for real-time chat."""

import json
from typing import Optional, Tuple

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from src.config import SessionLocal, settings
from src.models.session import ChatSession
from src.services.websocket_manager import websocket_manager
from src.utils.jwt import decode_jwt
from src.utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _get_db_session() -> Session:
    return SessionLocal()


def _authorize_ws(token: Optional[str], tenant_id: str) -> Tuple[Optional[str], Optional[str]]:
    """Decode token and enforce role/tenant constraints."""
    if settings.DISABLE_AUTH:
        return "anonymous", "chat_user"

    if not token:
        return None, None

    try:
        payload = decode_jwt(token)
    except Exception:
        return None, None
    roles = payload.get("roles", [])
    role = roles[0] if roles else payload.get("role")
    user_id = payload.get("sub")
    token_tenant = payload.get("tenant_id")

    if not user_id or not role or not token_tenant:
        return None, None

    if token_tenant != tenant_id:
        return None, None

    allowed_roles = {"admin", "supporter", "chat_user"}
    if role not in allowed_roles:
        return None, None

    return user_id, role


@router.websocket("/ws/{tenant_id}/session/{session_id}")
async def session_ws(
    websocket: WebSocket,
    tenant_id: str,
    session_id: str,
    token: Optional[str] = Query(None, description="JWT token for authentication"),
):
    """WebSocket endpoint for chat sessions."""
    await websocket.accept()

    user_id, role = _authorize_ws(token, tenant_id)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = _get_db_session()
    try:
        session: Optional[ChatSession] = (
            db.query(ChatSession)
            .filter(
                ChatSession.session_id == session_id,
                ChatSession.tenant_id == tenant_id,
            )
            .first()
        )
        if not session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Chat users must match session user
        if role == "chat_user" and str(session.user_id) != str(user_id):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Register connection (enforces limits)
        can_connect = await websocket_manager.connect(tenant_id, session_id, websocket)
        if not can_connect:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Send initial ready event
        await websocket.send_json(
            {
                "type": "connected",
                "session_id": session_id,
                "user_id": user_id,
                "role": role,
            }
        )

        # Listen for messages (no-op processing for now; keep alive/ping)
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                except Exception:
                    payload = {}

                if payload.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                # Additional inbound handling can be added here

        except WebSocketDisconnect:
            logger.info(
                "ws_disconnected_client",
                tenant_id=tenant_id,
                session_id=session_id,
                user_id=user_id,
            )
        except Exception as e:
            logger.error(
                "ws_receive_error",
                tenant_id=tenant_id,
                session_id=session_id,
                user_id=user_id,
                error=str(e),
            )
        finally:
            await websocket_manager.disconnect(tenant_id, session_id, websocket)
    finally:
        db.close()
