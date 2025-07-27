const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3002', 10);

// Ensure NEXTAUTH_URL is set for the custom server
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `http://${hostname}:${port}`;
}

// Create the Next.js app with proper configuration
const app = next({
  dev,
  hostname,
  port,
  // Ensure proper directory structure
  dir: '.',
  // Enable custom server mode
  customServer: true,
  // Ensure proper configuration loading
  conf: {
    // Disable static optimization for custom server
    experimental: {
      appDir: true,
    }
  }
});
const handle = app.getRequestHandler();

// Redis clients with graceful fallback
let redis, redisSub;
let redisAvailable = false;

// Initialize Redis with error handling
function initializeRedis() {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('Redis connection failed after 3 attempts - running without Redis');
          return null;
        }
        return Math.min(times * 1000, 5000);
      },
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisSub = redis.duplicate();

    redis.on('connect', () => {
      redisAvailable = true;
      console.log('Redis connected successfully');
    });

    redis.on('error', (err) => {
      if (redisAvailable) {
        console.warn('Redis connection lost:', err.message);
        redisAvailable = false;
      }
    });

    redisSub.on('error', (err) => {
      // Silently handle sub client errors
    });

    // Try to connect
    redis.connect().catch(() => {
      console.log('Redis not available - WebSocket server will run without Redis pub/sub');
      redisAvailable = false;
    });

    redisSub.connect().catch(() => {
      redisAvailable = false;
    });
  } catch (error) {
    console.log('Redis initialization skipped - running in single-server mode');
    redisAvailable = false;
  }
}

// Initialize Redis
initializeRedis();

// Socket.io event handlers
const setupSocketHandlers = (io) => {
  // Namespace for real-time updates
  const updates = io.of('/updates');
  
  // Redis subscription for real-time events (if available)
  if (redisAvailable && redisSub) {
    redisSub.subscribe('notifications', 'quick-notes', 'action-items', 'sessions')
      .then(() => {
        console.log('Subscribed to Redis channels');
        
        redisSub.on('message', (channel, message) => {
          try {
            const data = JSON.parse(message);
            
            switch (channel) {
              case 'notifications':
                // Send to specific user
                if (data.userId) {
                  updates.to(`user:${data.userId}`).emit('notification', data);
                }
                break;
                
              case 'quick-notes':
                // Send to team leader and managers
                if (data.teamLeaderId) {
                  updates.to(`user:${data.teamLeaderId}`).emit('quick-note', data);
                }
                // Also send to all managers
                updates.to('role:MANAGER').emit('quick-note', data);
                break;
                
              case 'action-items':
                // Send to assigned user and creator
                if (data.assignedTo) {
                  updates.to(`user:${data.assignedTo}`).emit('action-item', data);
                }
                if (data.createdBy) {
                  updates.to(`user:${data.createdBy}`).emit('action-item', data);
                }
                break;
                
              case 'sessions':
                // Send to agent and team leader
                if (data.agentId) {
                  updates.to(`user:${data.agentId}`).emit('session-update', data);
                }
                if (data.teamLeaderId) {
                  updates.to(`user:${data.teamLeaderId}`).emit('session-update', data);
                }
                break;
            }
          } catch (error) {
            console.error('Error processing Redis message:', error);
          }
        });
      })
      .catch((error) => {
        console.log('Could not subscribe to Redis channels:', error.message);
      });
  }
  
  updates.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle authentication
    socket.on('authenticate', async (data) => {
      try {
        const { userId, role } = data;
        
        if (userId) {
          // Join user-specific room
          socket.join(`user:${userId}`);
          
          // Join role-specific room
          if (role) {
            socket.join(`role:${role}`);
          }
          
          socket.emit('authenticated', { success: true });
          console.log(`User ${userId} authenticated with role ${role}`);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authenticated', { success: false, error: error.message });
      }
    });
    
    // Handle quick note creation
    socket.on('create-quick-note', async (data) => {
      try {
        // Publish to Redis for processing (if available)
        if (redisAvailable && redis) {
          await redis.publish('quick-notes-create', JSON.stringify(data));
        } else {
          // Direct emit in single-server mode
          updates.emit('quick-note', data);
        }
        socket.emit('quick-note-created', { success: true });
      } catch (error) {
        console.error('Error creating quick note:', error);
        socket.emit('quick-note-created', { success: false, error: error.message });
      }
    });
    
    // Handle action item updates
    socket.on('update-action-item', async (data) => {
      try {
        // Publish to Redis for processing (if available)
        if (redisAvailable && redis) {
          await redis.publish('action-items-update', JSON.stringify(data));
        } else {
          // Direct emit in single-server mode
          updates.emit('action-item', data);
        }
        socket.emit('action-item-updated', { success: true });
      } catch (error) {
        console.error('Error updating action item:', error);
        socket.emit('action-item-updated', { success: false, error: error.message });
      }
    });
    
    // Handle typing indicators for coaching sessions
    socket.on('typing', (data) => {
      const { sessionId, userId, isTyping } = data;
      socket.to(`session:${sessionId}`).emit('user-typing', { userId, isTyping });
    });
    
    // Join session room
    socket.on('join-session', (sessionId) => {
      socket.join(`session:${sessionId}`);
      console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });
    
    // Leave session room
    socket.on('leave-session', (sessionId) => {
      socket.leave(`session:${sessionId}`);
      console.log(`Socket ${socket.id} left session ${sessionId}`);
    });
    
    // Handle test events for WebSocket testing
    socket.on('quickNote:create', (data) => {
      console.log('Quick note created:', data);
      // Emit to all clients in the session
      socket.to(`session:${data.sessionId}`).emit('quickNote:created', data);
      // Also emit back to sender
      socket.emit('quickNote:created', data);
      // Also emit to the updates namespace
      updates.emit('quickNote:created', data);
    });

    socket.on('actionItem:create', (data) => {
      console.log('Action item created:', data);
      // Emit to all clients in the session
      socket.to(`session:${data.sessionId}`).emit('actionItem:created', data);
      // Also emit back to sender
      socket.emit('actionItem:created', data);
      // Also emit to the updates namespace
      updates.emit('actionItem:created', data);
    });

    socket.on('notification:send', (data) => {
      console.log('Notification sent:', data);
      // Emit to specific user or broadcast
      if (data.userId) {
        socket.to(`user:${data.userId}`).emit('notification', data);
      }
      // Also emit back to sender
      socket.emit('notification', data);
    });

    socket.on('session:update', (data) => {
      console.log('Session updated:', data);
      // Emit to all clients in the session
      socket.to(`session:${data.sessionId}`).emit('session:updated', data);
      // Also emit back to sender
      socket.emit('session:updated', data);
      // Also emit to the updates namespace
      updates.emit('session:updated', data);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Handle Next.js pages and API routes
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });
  
  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
      credentials: true
    },
    path: '/socket.io/'
  });
  
  // Setup socket handlers
  setupSocketHandlers(io);
  
  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });
  
  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> WebSocket server ready');
    if (redisAvailable) {
      console.log('> Redis pub/sub enabled for multi-server support');
    } else {
      console.log('> Running in single-server mode (Redis not available)');
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (redis) redis.disconnect();
  if (redisSub) redisSub.disconnect();
  process.exit(0);
});