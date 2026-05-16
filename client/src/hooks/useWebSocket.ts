import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback((serverId: string) => {
    const socket = io('/', {
      withCredentials: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('terminal:connect', { serverId, cols: 80, rows: 24 });
    });

    socketRef.current = socket;
    return socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, socketRef };
}
