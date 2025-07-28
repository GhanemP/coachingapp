import { Server as HTTPServer } from 'http';

import { getToken } from 'next-auth/jwt';
import { Server as SocketIOServer, Socket } from 'socket.io';

import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data: {
    relatedId: string;
    relatedType: string;
  };
}

interface QuickNote {
  id: string;
  agentId: string;
  createdBy: {
    name: string;
  };
}

interface ActionItem {
  id: string;
  agentId: string;
  agent?: {
    teamLeaderId?: string;
  };
}

interface Session {
  id: string;
  agentId: string;
  scheduledDate?: Date;
  currentScore?: number;
}

interface ActionPlan {
  id: string;
  agentId: string;
  title: string;
  agent?: {
    teamLeaderId?: string;
  };
}

let io: SocketIOServer | null = null;

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env['NEXTAUTH_URL'] || 'http://localhost:3000',
      credentials: true,
    },
    path: '/api/socket',
  });

  // Enhanced authentication middleware with JWT verification
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth['token'];
      const sessionId = socket.handshake.auth['sessionId'];

      if (!token && !sessionId) {
        return next(new Error('Authentication failed: No token or session provided'));
      }

      let userId: string | null = null;
      let userRole: string | null = null;

      // JWT token verification (production)
      if (token) {
        try {
          const decoded = await getToken({
            req: socket.request as Parameters<typeof getToken>[0]['req'],
            secret: process.env['NEXTAUTH_SECRET'],
          });

          if (!decoded || !decoded.sub) {
            return next(new Error('Authentication failed: Invalid token'));
          }

          userId = decoded.sub;
          userRole = decoded.role as string;

          // Verify user exists and is active
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, isActive: true },
          });

          if (!user || !user.isActive) {
            return next(new Error('Authentication failed: User not found or inactive'));
          }

          userRole = user.role;
        } catch (error) {
          logger.error('JWT verification failed:', error as Error);
          return next(new Error('Authentication failed: Token verification failed'));
        }
      }
      // Session ID validation (development/fallback)
      else if (sessionId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: sessionId },
            select: { id: true, role: true, isActive: true },
          });

          if (!user || !user.isActive) {
            return next(new Error('Authentication failed: Invalid session'));
          }

          userId = user.id;
          userRole = user.role;
        } catch (error) {
          logger.error('Session validation failed:', error as Error);
          return next(new Error('Authentication failed: Session validation failed'));
        }
      }

      if (!userId || !userRole) {
        return next(new Error('Authentication failed: Unable to determine user identity'));
      }

      // Store user info in socket
      (socket as Socket & { userId?: string; userRole?: string }).userId = userId;
      (socket as Socket & { userId?: string; userRole?: string }).userRole = userRole;
      socket.data.userId = userId;
      socket.data.userRole = userRole;

      logger.info(`Socket authenticated for user: ${userId} with role: ${userRole}`);
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error as Error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as Socket & { userId?: string }).userId || socket.data.userId;
    const userRole = (socket as Socket & { userRole?: string }).userRole || socket.data.userRole;
    logger.info(`Authenticated user connected: ${userId} with role: ${userRole}`);

    // Automatically join user to their personal room
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info(`User ${userId} auto-joined their personal room`);
    }

    // Handle joining user room (additional rooms)
    socket.on('join-user-room', (targetUserId: string) => {
      // Only allow joining own room or if authorized
      if (targetUserId === userId) {
        socket.join(`user:${targetUserId}`);
        logger.info(`User ${userId} joined user room: ${targetUserId}`);
      } else {
        logger.warn(`User ${userId} attempted to join unauthorized room: ${targetUserId}`);
      }
    });

    // Handle joining role room - validate user has the role
    socket.on('join-role-room', async (role: string) => {
      try {
        // Verify user actually has this role by checking database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (user && user.role === role) {
          socket.join(`role:${role}`);
          logger.info(`User ${userId} joined role room: ${role}`);
        } else {
          logger.warn(
            `User ${userId} attempted to join unauthorized role room: ${role} (actual role: ${user?.role})`
          );
          socket.emit('error', { message: 'Unauthorized: Invalid role' });
        }
      } catch (error) {
        logger.error('Error validating role room access:', error as Error);
        socket.emit('error', { message: 'Failed to join role room' });
      }
    });

    // Handle joining team rooms for team leaders - validate authorization
    socket.on('join-team-room', async (teamLeaderId: string) => {
      try {
        // Verify user is authorized to join this team room
        const isAuthorized =
          teamLeaderId === userId || userRole === 'MANAGER' || userRole === 'ADMIN';

        if (isAuthorized) {
          // Additional check: verify the team leader exists and user has access
          const teamLeader = await prisma.user.findUnique({
            where: { id: teamLeaderId },
            select: { id: true, role: true },
          });

          if (teamLeader && (teamLeader.role === 'TEAM_LEADER' || teamLeader.role === 'MANAGER')) {
            socket.join(`team:${teamLeaderId}`);
            logger.info(`User ${userId} joined team room: ${teamLeaderId}`);
          } else {
            logger.warn(`User ${userId} attempted to join invalid team room: ${teamLeaderId}`);
            socket.emit('error', { message: 'Invalid team leader' });
          }
        } else {
          logger.warn(`User ${userId} attempted to join unauthorized team room: ${teamLeaderId}`);
          socket.emit('error', { message: 'Unauthorized: Cannot join team room' });
        }
      } catch (error) {
        logger.error('Error validating team room access:', error as Error);
        socket.emit('error', { message: 'Failed to join team room' });
      }
    });

    // Handle joining agent rooms - validate authorization
    socket.on('join-agent-room', async (agentId: string) => {
      try {
        // Verify user is authorized to join this agent room
        const agent = await prisma.user.findUnique({
          where: { id: agentId },
          select: {
            id: true,
            role: true,
            teamLeaderId: true,
            managedBy: true,
          },
        });

        if (!agent || agent.role !== 'AGENT') {
          logger.warn(`User ${userId} attempted to join invalid agent room: ${agentId}`);
          socket.emit('error', { message: 'Invalid agent' });
          return;
        }

        // Check authorization based on user role
        const isAuthorized =
          agentId === userId || // Agent can join their own room
          agent.teamLeaderId === userId || // Team leader can join their agents' rooms
          agent.managedBy === userId || // Manager can join their managed agents' rooms
          userRole === 'ADMIN'; // Admin can join any room

        if (isAuthorized) {
          socket.join(`agent:${agentId}`);
          logger.info(`User ${userId} joined agent room: ${agentId}`);
        } else {
          logger.warn(`User ${userId} attempted to join unauthorized agent room: ${agentId}`);
          socket.emit('error', { message: 'Unauthorized: Cannot join agent room' });
        }
      } catch (error) {
        logger.error('Error validating agent room access:', error as Error);
        socket.emit('error', { message: 'Failed to join agent room' });
      }
    });

    // Handle real-time notifications with user validation
    socket.on('mark-notification-read', async (data: { notificationId: string }) => {
      try {
        const { notificationId } = data;

        if (!userId) {
          logger.error('User not authenticated for notification action');
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Verify notification belongs to user and update in database
        const notification = await prisma.notification.findUnique({
          where: { id: notificationId },
          select: { id: true, userId: true, isRead: true },
        });

        if (!notification) {
          logger.warn(
            `User ${userId} attempted to mark non-existent notification as read: ${notificationId}`
          );
          socket.emit('error', { message: 'Notification not found' });
          return;
        }

        if (notification.userId !== userId) {
          logger.warn(
            `User ${userId} attempted to mark unauthorized notification as read: ${notificationId}`
          );
          socket.emit('error', { message: 'Unauthorized: Cannot modify this notification' });
          return;
        }

        // Update notification in database
        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        logger.info(`User ${userId} marked notification ${notificationId} as read`);

        // Emit back to user confirming the action
        socket.emit('notification-marked-read', {
          notificationId,
          userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error marking notification as read:', error as Error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Handle disconnect with user context
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Helper functions to emit events
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: unknown): void {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

export function emitToTeam(teamLeaderId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`team:${teamLeaderId}`).emit(event, data);
  }
}

export function emitToAgent(agentId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`agent:${agentId}`).emit(event, data);
  }
}

// Notification helpers
export async function sendNotification(notification: NotificationData): Promise<{
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: {
    relatedId: string;
    relatedType: string;
  };
  createdAt: Date;
  isRead: boolean;
}> {
  try {
    // Save notification to database
    const newNotification = await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: false,
      },
    });

    // Emit to user via socket
    emitToUser(notification.userId, 'new-notification', {
      id: newNotification.id,
      userId: newNotification.userId,
      type: newNotification.type,
      title: newNotification.title,
      message: newNotification.message,
      data: newNotification.data,
      createdAt: newNotification.createdAt,
      isRead: newNotification.isRead,
    });

    return {
      id: newNotification.id,
      userId: newNotification.userId,
      type: newNotification.type,
      title: newNotification.title,
      message: newNotification.message,
      data: notification.data,
      createdAt: newNotification.createdAt,
      isRead: newNotification.isRead,
    };
  } catch (error) {
    logger.error('Error sending notification:', error as Error);
    throw error;
  }
}

// Event emitters for specific actions
export async function notifyQuickNoteCreated(quickNote: QuickNote): Promise<void> {
  const notification: NotificationData = {
    userId: quickNote.agentId,
    type: 'QUICK_NOTE',
    title: 'New Quick Note',
    message: `A new quick note has been added by ${quickNote.createdBy.name}`,
    data: {
      relatedId: quickNote.id,
      relatedType: 'quick_note',
    },
  };

  await sendNotification(notification);
  emitToAgent(quickNote.agentId, 'quick-note-created', quickNote);
}

export async function notifyActionItemCreated(actionItem: ActionItem): Promise<void> {
  const notification: NotificationData = {
    userId: actionItem.agentId,
    type: 'ACTION_ITEM',
    title: 'New Action Item',
    message: `A new action item has been assigned to you`,
    data: {
      relatedId: actionItem.id,
      relatedType: 'action_item',
    },
  };

  await sendNotification(notification);
  emitToAgent(actionItem.agentId, 'action-item-created', actionItem);
}

export function notifyActionItemUpdated(actionItem: ActionItem): void {
  emitToAgent(actionItem.agentId, 'action-item-updated', actionItem);

  // Also notify the team leader
  if (actionItem.agent?.teamLeaderId) {
    emitToUser(actionItem.agent.teamLeaderId, 'action-item-updated', actionItem);
  }
}

export async function notifySessionScheduled(session: Session): Promise<void> {
  const notification: NotificationData = {
    userId: session.agentId,
    type: 'SESSION_SCHEDULED',
    title: 'Coaching Session Scheduled',
    message: `A coaching session has been scheduled for ${session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString() : 'TBD'}`,
    data: {
      relatedId: session.id,
      relatedType: 'session',
    },
  };

  await sendNotification(notification);
  emitToAgent(session.agentId, 'session-scheduled', session);
}

export async function notifySessionCompleted(session: Session): Promise<void> {
  const notification: NotificationData = {
    userId: session.agentId,
    type: 'SESSION_COMPLETED',
    title: 'Coaching Session Completed',
    message: `Your coaching session has been completed with a score of ${session.currentScore}%`,
    data: {
      relatedId: session.id,
      relatedType: 'session',
    },
  };

  await sendNotification(notification);
  emitToAgent(session.agentId, 'session-completed', session);
}

export async function notifyActionPlanCreated(actionPlan: ActionPlan): Promise<void> {
  const notification: NotificationData = {
    userId: actionPlan.agentId,
    type: 'ACTION_PLAN',
    title: 'New Action Plan',
    message: `A new action plan "${actionPlan.title}" has been created for you`,
    data: {
      relatedId: actionPlan.id,
      relatedType: 'action_plan',
    },
  };

  await sendNotification(notification);
  emitToAgent(actionPlan.agentId, 'action-plan-created', actionPlan);
}

export function notifyActionPlanUpdated(actionPlan: ActionPlan): void {
  emitToAgent(actionPlan.agentId, 'action-plan-updated', actionPlan);

  // Also notify the team leader
  if (actionPlan.agent?.teamLeaderId) {
    emitToUser(actionPlan.agent.teamLeaderId, 'action-plan-updated', actionPlan);
  }
}
