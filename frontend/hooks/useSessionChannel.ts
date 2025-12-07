import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiBaseUrl } from '../services/chatService';

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseSessionChannelParams {
  tenantId: string;
  sessionId: string;
  token: string;
  enabled?: boolean;
  onEvent: (event: any) => void;
  onTokenUpdated?: (token: string) => void;
  refreshToken?: () => Promise<string | undefined>;
}

interface UseSessionChannelReturn {
  status: WebSocketStatus;
  error?: string;
  send: (data: any) => void;
  close: () => void;
}

/**
 * WebSocket client with reconnect + token refresh fallback.
 */
export function useSessionChannel({
  tenantId,
  sessionId,
  token,
  enabled = true,
  onEvent,
  onTokenUpdated,
  refreshToken,
}: UseSessionChannelParams): UseSessionChannelReturn {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [error, setError] = useState<string>();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const refreshAttemptedRef = useRef(false);
  const tokenRef = useRef(token);

  // Keep latest token
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled || !tenantId || !sessionId || !tokenRef.current) {
      return;
    }

    // Clean existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');
    setError(undefined);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = getApiBaseUrl().replace(/^http/, 'ws'); // handle custom base
    const wsUrl = `${protocol}//${new URL(base).host}/api/ws/${tenantId}/session/${sessionId}?token=${encodeURIComponent(
      tokenRef.current
    )}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setStatus('connected');
        retryRef.current = 0;
        refreshAttemptedRef.current = false;
        onEvent({ type: 'connected' });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        setError('WebSocket error');
      };

      ws.onclose = async () => {
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt token refresh once on auth-ish close
        if (!refreshAttemptedRef.current) {
          refreshAttemptedRef.current = true;
          try {
            if (refreshToken) {
              const newToken = await refreshToken();
              if (newToken) {
                tokenRef.current = newToken;
                onTokenUpdated?.(newToken);
                retryRef.current = 0;
                connect();
                return;
              }
            } else if (onTokenUpdated && tokenRef.current) {
              // If no refresh function is provided but caller can update token from elsewhere, notify
              onTokenUpdated(tokenRef.current);
              retryRef.current = 0;
              connect();
              return;
            }
          } catch (e) {
            console.error('WS token refresh failed', e);
          }
        }

        // Backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 15000);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('WS connect error', e);
      setStatus('error');
      setError('Failed to connect');
    }
  }, [enabled, onEvent, tenantId, sessionId, onTokenUpdated]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      close();
    };
  }, [connect, close, enabled, tenantId, sessionId]);

  return { status, error, send, close };
}
