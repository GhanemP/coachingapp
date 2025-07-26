'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;
let globalSocketPromise: Promise<Socket> | null = null;

export function useSocket(): UseSocketReturn {
  const { data: session, status } = useSession();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const mountedRef = useRef(true);
  const notificationsLoadedRef = useRef(false);

  // Get or create socket instance - no dependencies to prevent recreation
  const getSocket = useCallback(async (userId: string | undefined, authStatus: string): Promise<Socket | null> => {
    if (!userId || authStatus !== 'authenticated') {
      return null;
    }

    // Return existing socket if available
    if (globalSocket?.connected) {
      return globalSocket;
    }

    // Return existing promise if socket is being created
    if (globalSocketPromise) {
      return globalSocketPromise;
    }

    // Create new socket
    globalSocketPromise = new Promise((resolve) => {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
                       (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3002` : 'http://localhost:3002');
      
      const newSocket = io(socketUrl, {
        path: '/socket.io/',
        auth: {
          sessionId: userId,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      globalSocket = newSocket;

      // Set up global event handlers once
      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Real-time update handlers (global)
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

      resolve(newSocket);
    });

    return globalSocketPromise;
  }, []); // Empty dependency array - function never changes

  // Initialize socket and set up component-specific handlers
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const initSocket = async () => {
      const socket = await getSocket(session?.user?.id, status);
      if (!socket || !mountedRef.current) return;

      setConnected(socket.connected);

      // Component-specific handlers
      const handleConnect = () => {
        if (mountedRef.current) {
          setConnected(true);
        }
      };

      const handleDisconnect = () => {
        if (mountedRef.current) {
          setConnected(false);
        }
      };

      const handleNewNotification = (notification: Notification) => {
        if (mountedRef.current) {
          setNotifications((prev) => [notification, ...prev]);
          toast(notification.message, {
            duration: 5000,
            position: 'top-right',
            icon: '🔔',
          });
        }
      };

      const handleNotificationMarkedRead = (data: { notificationId: string; userId: string; timestamp: string }) => {
        if (mountedRef.current) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === data.notificationId ? { ...n, isRead: true, readAt: new Date(data.timestamp) } : n
            )
          );
        }
      };

      // Register handlers
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('new-notification', handleNewNotification);
      socket.on('notification-marked-read', handleNotificationMarkedRead);

      // Cleanup function
      cleanup = () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('new-notification', handleNewNotification);
        socket.off('notification-marked-read', handleNotificationMarkedRead);
      };
    };

    initSocket();

    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
  }, [status, session?.user?.id]); // Remove getSocket from dependencies

  // Load notifications once
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !notificationsLoadedRef.current) {
      notificationsLoadedRef.current = true;
      
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && mountedRef.current) {
            setNotifications(data);
          }
        })
        .catch((error) => {
          console.error('Error loading notifications:', error);
        });
    }
  }, [status, session?.user?.id]);

  // Memoized values and callbacks
  const unreadCount = useMemo(() => 
    notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markNotificationRead = useCallback((notificationId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('mark-notification-read', { notificationId });
    }
  }, []);

  const joinAgentRoom = useCallback((agentId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('join-agent-room', agentId);
    }
  }, []);

  const joinTeamRoom = useCallback((teamLeaderId: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('join-team-room', teamLeaderId);
    }
  }, []);

  const on = useCallback((event: string, handler: SocketEventHandler) => {
    if (globalSocket) {
      globalSocket.on(event, handler);
    }
  }, []);

  const off = useCallback((event: string, handler: SocketEventHandler) => {
    if (globalSocket) {
      globalSocket.off(event, handler);
    }
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, ...args);
    }
  }, []);

  return useMemo(() => ({
    socket: globalSocket,
    connected,
    notifications,
    unreadCount,
    markNotificationRead,
    joinAgentRoom,
    joinTeamRoom,
    on,
    off,
    emit,
  }), [
    connected,
    notifications,
    unreadCount,
    markNotificationRead,
    joinAgentRoom,
    joinTeamRoom,
    on,
    off,
    emit,
  ]);
}