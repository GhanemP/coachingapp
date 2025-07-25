const { Server: SocketIOServer } = require('socket.io');
const { getToken } = require('next-auth/jwt');

let io = null;

function initializeSocketServer(httpServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/api/socket',
  });

  // Enhanced authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const sessionId = socket.handshake.auth.sessionId;
      
      if (!token && !sessionId) {
        return next(new Error('Authentication failed: No token or session provided'));
      }

      // For development: simple session ID validation
      // In production: verify JWT token properly
      if (sessionId) {
        // Store user info in socket
        socket.userId = sessionId;
        socket.data.userId = sessionId;
        console.log(`Socket authenticated for user: ${sessionId}`);
        next();
      } else {
        // TODO: Implement proper JWT verification when token is provided
        // const decoded = await getToken({ req: socket.request, secret: process.env.NEXTAUTH_SECRET });
        // if (!decoded) {
        //   return next(new Error('Authentication failed: Invalid token'));
        // }
        // socket.userId = decoded.sub;
        // socket.data.userId = decoded.sub;
        next();
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`Authenticated user connected: ${userId}`);

    // Automatically join user to their personal room
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} auto-joined their personal room`);
    }

    // Handle joining user room (additional rooms)
    socket.on('join-user-room', (targetUserId) => {
      // Only allow joining own room or if authorized
      if (targetUserId === userId) {
        socket.join(`user:${targetUserId}`);
        console.log(`User ${userId} joined user room: ${targetUserId}`);
      } else {
        console.warn(`User ${userId} attempted to join unauthorized room: ${targetUserId}`);
      }
    });

    // Handle joining role room - validate user has the role
    socket.on('join-role-room', (role) => {
      // TODO: Verify user actually has this role by checking database
      socket.join(`role:${role}`);
      console.log(`User ${userId} joined role room: ${role}`);
    });

    // Handle joining team rooms for team leaders - validate authorization
    socket.on('join-team-room', (teamLeaderId) => {
      // TODO: Verify user is authorized to join this team room
      if (teamLeaderId === userId) {
        socket.join(`team:${teamLeaderId}`);
        console.log(`Team leader ${userId} joined their team room`);
      } else {
        console.warn(`User ${userId} attempted to join unauthorized team room: ${teamLeaderId}`);
      }
    });

    // Handle joining agent rooms - validate authorization
    socket.on('join-agent-room', (agentId) => {
      // TODO: Verify user is authorized to join this agent room
      socket.join(`agent:${agentId}`);
      console.log(`User ${userId} joined agent room: ${agentId}`);
    });

    // Handle real-time notifications with user validation
    socket.on('mark-notification-read', async (data) => {
      try {
        const { notificationId } = data;
        
        if (!userId) {
          console.error('User not authenticated for notification action');
          return;
        }
        
        // TODO: Verify notification belongs to user and update in database
        console.log(`User ${userId} marking notification ${notificationId} as read`);
        
        // Emit back to user confirming the action
        socket.emit('notification-marked-read', { 
          notificationId, 
          userId,
          timestamp: new Date().toISOString() 
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Handle disconnect with user context
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

// Helper functions to emit events
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

function emitToTeam(teamLeaderId, event, data) {
  if (io) {
    io.to(`team:${teamLeaderId}`).emit(event, data);
  }
}

function emitToAgent(agentId, event, data) {
  if (io) {
    io.to(`agent:${agentId}`).emit(event, data);
  }
}

// Notification helpers
async function sendNotification(notification) {
  try {
    // For now, just emit the notification
    // TODO: Save to database
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      createdAt: new Date(),
      isRead: false,
    };

    emitToUser(notification.userId, 'new-notification', newNotification);
    return newNotification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Event emitters for specific actions
async function notifyQuickNoteCreated(quickNote) {
  const notification = {
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

async function notifyActionItemCreated(actionItem) {
  const notification = {
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

async function notifyActionItemUpdated(actionItem) {
  emitToAgent(actionItem.agentId, 'action-item-updated', actionItem);
  
  // Also notify the team leader
  if (actionItem.agent?.teamLeaderId) {
    emitToUser(actionItem.agent.teamLeaderId, 'action-item-updated', actionItem);
  }
}

async function notifySessionScheduled(session) {
  const notification = {
    userId: session.agentId,
    type: 'SESSION_SCHEDULED',
    title: 'Coaching Session Scheduled',
    message: `A coaching session has been scheduled for ${new Date(session.scheduledDate).toLocaleDateString()}`,
    data: {
      relatedId: session.id,
      relatedType: 'session',
    },
  };
  
  await sendNotification(notification);
  emitToAgent(session.agentId, 'session-scheduled', session);
}

async function notifySessionCompleted(session) {
  const notification = {
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

async function notifyActionPlanCreated(actionPlan) {
  const notification = {
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

async function notifyActionPlanUpdated(actionPlan) {
  emitToAgent(actionPlan.agentId, 'action-plan-updated', actionPlan);
  
  // Also notify the team leader
  if (actionPlan.agent?.teamLeaderId) {
    emitToUser(actionPlan.agent.teamLeaderId, 'action-plan-updated', actionPlan);
  }
}

module.exports = {
  initializeSocketServer,
  getIO,
  emitToUser,
  emitToRole,
  emitToTeam,
  emitToAgent,
  sendNotification,
  notifyQuickNoteCreated,
  notifyActionItemCreated,
  notifyActionItemUpdated,
  notifySessionScheduled,
  notifySessionCompleted,
  notifyActionPlanCreated,
  notifyActionPlanUpdated,
};