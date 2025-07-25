import { io, Socket } from 'socket.io-client';
import type {
  QuickNoteEvent,
  ActionItemEvent,
  SessionUpdateEvent,
  NotificationEvent,
  AuthenticationResponse,
  UserTypingEvent,
} from '@/types/socket';

let socket: Socket | null = null;

export const initializeSocket = (userId: string, role: string): Socket => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    socket = io(`${socketUrl}/updates`, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Authenticate the user
      socket?.emit('authenticate', { userId, role });
    });

    socket.on('authenticated', (data: AuthenticationResponse) => {
      if (data.success) {
        console.log('WebSocket authentication successful');
      } else {
        console.error('WebSocket authentication failed:', data.error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Event emitters
export const emitQuickNote = (data: Partial<QuickNoteEvent>): void => {
  if (socket) {
    socket.emit('create-quick-note', data);
  }
};

export const emitActionItemUpdate = (data: Partial<ActionItemEvent>): void => {
  if (socket) {
    socket.emit('update-action-item', data);
  }
};

export const joinSession = (sessionId: string): void => {
  if (socket) {
    socket.emit('join-session', sessionId);
  }
};

export const leaveSession = (sessionId: string): void => {
  if (socket) {
    socket.emit('leave-session', sessionId);
  }
};

export const emitTyping = (sessionId: string, userId: string, isTyping: boolean): void => {
  if (socket) {
    socket.emit('typing', { sessionId, userId, isTyping });
  }
};

// Event listeners
export const onNotification = (callback: (data: NotificationEvent) => void): void => {
  if (socket) {
    socket.on('notification', callback);
  }
};

export const onQuickNote = (callback: (data: QuickNoteEvent) => void): void => {
  if (socket) {
    socket.on('quick-note', callback);
  }
};

export const onActionItem = (callback: (data: ActionItemEvent) => void): void => {
  if (socket) {
    socket.on('action-item', callback);
  }
};

export const onSessionUpdate = (callback: (data: SessionUpdateEvent) => void): void => {
  if (socket) {
    socket.on('session-update', callback);
  }
};

export const onUserTyping = (callback: (data: UserTypingEvent) => void): void => {
  if (socket) {
    socket.on('user-typing', callback);
  }
};

// Remove event listeners
export const offNotification = (): void => {
  if (socket) {
    socket.off('notification');
  }
};

export const offQuickNote = (): void => {
  if (socket) {
    socket.off('quick-note');
  }
};

export const offActionItem = (): void => {
  if (socket) {
    socket.off('action-item');
  }
};

export const offSessionUpdate = (): void => {
  if (socket) {
    socket.off('session-update');
  }
};

export const offUserTyping = (): void => {
  if (socket) {
    socket.off('user-typing');
  }
};