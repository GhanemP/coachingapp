const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: dev
        ? `http://localhost:${port}`
        : process.env.NEXTAUTH_URL || 'https://your-domain.com',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket.IO connection handling
  io.on('connection', socket => {
    console.log(`Client connected: ${socket.id}`);

    // Handle authentication
    socket.on('authenticate', data => {
      // In a real implementation, verify the user's session/token
      console.log('User authenticated:', data.userId);
      socket.userId = data.userId;
      socket.join(`user:${data.userId}`);
    });

    // Handle real-time notifications
    socket.on('subscribe-notifications', userId => {
      socket.join(`notifications:${userId}`);
      console.log(`User ${userId} subscribed to notifications`);
    });

    // Handle coaching session updates
    socket.on('join-session', sessionId => {
      socket.join(`session:${sessionId}`);
      console.log(`Client joined session: ${sessionId}`);
    });

    socket.on('session-update', data => {
      socket.to(`session:${data.sessionId}`).emit('session-updated', data);
    });

    // Handle quick notes updates
    socket.on('note-created', data => {
      // Broadcast to relevant team members
      io.to(`team:${data.teamId}`).emit('new-note', data);
    });

    // Handle action items updates
    socket.on('action-item-updated', data => {
      // Notify the assigned agent
      io.to(`user:${data.agentId}`).emit('action-item-update', data);
    });

    // Handle disconnection
    socket.on('disconnect', reason => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Error handling
    socket.on('error', error => {
      console.error('Socket error:', error);
    });
  });

  // Graceful shutdown handling
  const gracefulShutdown = signal => {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    httpServer.close(() => {
      console.log('HTTP server closed.');
      io.close(() => {
        console.log('Socket.IO server closed.');
        process.exit(0);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Start the server
  httpServer
    .once('error', err => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
      console.log(`> Socket.IO server initialized`);
    });
});
