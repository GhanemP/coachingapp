'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

interface QuickNoteData {
  id: string;
  agentId: string;
  content: string;
  category: string;
  authorId: string;
  createdAt: Date;
}

interface ActionItemData {
  id: string;
  agentId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: Date;
  assignedTo: string;
  createdBy: string;
}

interface SessionData {
  id: string;
  agentId: string;
  teamLeaderId: string;
  scheduledDate: Date;
  type: string;
  status: string;
}

interface ActionPlanData {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

type SocketEventHandler = (...args: unknown[]) => void;

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (notificationId: string) => void;
  joinAgentRoom: (agentId: string) => void;
  joinTeamRoom: (teamLeaderId: string) => void;
  on: (event: string, handler: SocketEventHandler) => void;
  off: (event: string, handler: SocketEventHandler) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

export function useSocket(): UseSocketReturn {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !socketRef.current) {
      const newSocket = io({
        path: '/socket.io/',
        auth: {
          sessionId: session.user.id,
        },
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Handle notifications
      newSocket.on('new-notification', (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        
        // Show toast notification
        toast(notification.message, {
          duration: 5000,
          position: 'top-right',
          icon: '🔔',
        });
      });

      newSocket.on('notification-marked-read', (data: { notificationId: string; userId: string; timestamp: string }) => {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === data.notificationId ? { ...n, isRead: true, readAt: new Date(data.timestamp) } : n
          )
        );
      });

      // Handle real-time updates
      newSocket.on('quick-note-created', (data: QuickNoteData) => {
        console.log('Quick note created:', data);
      });

      newSocket.on('action-item-created', (data: ActionItemData) => {
        console.log('Action item created:', data);
      });

      newSocket.on('action-item-updated', (data: ActionItemData) => {
        console.log('Action item updated:', data);
      });

      newSocket.on('session-scheduled', (data: SessionData) => {
        console.log('Session scheduled:', data);
      });

      newSocket.on('session-completed', (data: SessionData) => {
        console.log('Session completed:', data);
      });

      newSocket.on('action-plan-created', (data: ActionPlanData) => {
        console.log('Action plan created:', data);
      });

      newSocket.on('action-plan-updated', (data: ActionPlanData) => {
        console.log('Action plan updated:', data);
      });

      return () => {
        newSocket.disconnect();
        socketRef.current = null;
      };
    }
  }, [status, session]);

  // Load existing notifications
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setNotifications(data);
          }
        })
        .catch((error) => {
          console.error('Error loading notifications:', error);
        });
    }
  }, [status, session]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markNotificationRead = useCallback((notificationId: string) => {
    if (socket) {
      socket.emit('mark-notification-read', { notificationId });
    }
  }, [socket]);

  const joinAgentRoom = useCallback((agentId: string) => {
    if (socket) {
      socket.emit('join-agent-room', agentId);
    }
  }, [socket]);

  const joinTeamRoom = useCallback((teamLeaderId: string) => {
    if (socket) {
      socket.emit('join-team-room', teamLeaderId);
    }
  }, [socket]);

  const on = useCallback((event: string, handler: SocketEventHandler) => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const off = useCallback((event: string, handler: SocketEventHandler) => {
    if (socket) {
      socket.off(event, handler);
    }
  }, [socket]);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    if (socket) {
      socket.emit(event, ...args);
    }
  }, [socket]);

  return {
    socket,
    connected,
    notifications,
    unreadCount,
    markNotificationRead,
    joinAgentRoom,
    joinTeamRoom,
    on,
    off,
    emit,
  };
}