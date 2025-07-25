import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

// Define event payload types
interface AuthenticatePayload {
  userId: string;
  role: string;
}

interface TypingPayload {
  sessionId: string;
  userId: string;
  isTyping: boolean;
}

interface NotificationPayload {
  id: string;
  message: string;
}

// Define event types
interface SocketEventMap {
  'authenticate': (data: AuthenticatePayload) => void;
  'create-quick-note': (data: unknown) => void;
  'update-action-item': (data: unknown) => void;
  'join-session': (sessionId: string) => void;
  'leave-session': (sessionId: string) => void;
  'typing': (data: TypingPayload) => void;
  'notification': (data: NotificationPayload) => void;
}

const useSocket = () => {
  const socketRef = useRef<Socket<SocketEventMap> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = session?.user?.role || '';

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/socket.io/',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    const handleConnect = () => {
      setIsConnected(true);
      console.log('Connected to Socket.IO server');
      
      // Authenticate with server
      socket.emit('authenticate', { userId, role });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from Socket.IO server');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [userId, role]);

  // Helper function to emit events
  const emitEvent = useCallback(<K extends keyof SocketEventMap>(
    event: K,
    ...args: Parameters<SocketEventMap[K]>
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn(`Socket not connected. Could not emit ${event} event`);
    }
  }, []);

  // Join a session room
  const joinSession = useCallback((sessionId: string) => {
    emitEvent('join-session', sessionId);
  }, [emitEvent]);

  // Leave a session room
  const leaveSession = useCallback((sessionId: string) => {
    emitEvent('leave-session', sessionId);
  }, [emitEvent]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((sessionId: string, isTyping: boolean) => {
    if (!userId) return;
    emitEvent('typing', { sessionId, userId, isTyping });
  }, [emitEvent, userId]);

  return {
    socket: socketRef.current,
    emitEvent,
    joinSession,
    leaveSession,
    sendTypingIndicator,
    isConnected
  };
};

export default useSocket;