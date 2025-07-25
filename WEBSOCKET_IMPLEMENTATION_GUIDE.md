# WebSocket Implementation Guide

## Overview
This guide provides detailed instructions for implementing and using WebSocket functionality in the Coach App v2 using Socket.io.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Server Setup](#server-setup)
3. [Client Implementation](#client-implementation)
4. [Event Reference](#event-reference)
5. [Testing WebSockets](#testing-websockets)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Architecture Overview

### Technology Stack
- **Socket.io**: Real-time bidirectional event-based communication
- **Redis** (optional): For horizontal scaling with multiple server instances
- **TypeScript**: Full type safety for events and payloads

### Key Features
- Automatic reconnection
- Room-based communication for coaching sessions
- Authentication via NextAuth sessions
- Graceful fallback when Redis is unavailable

## Server Setup

The WebSocket server is integrated into the Next.js custom server (`server.js`).

### Key Components

1. **Server Initialization**
```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    credentials: true
  }
});
```

2. **Redis Integration** (optional for scaling)
```javascript
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

3. **Authentication Middleware**
```javascript
io.use(async (socket, next) => {
  const sessionId = socket.handshake.auth.sessionId;
  // Verify session
  next();
});
```

## Client Implementation

### 1. Socket Context Provider

Create a context provider for managing socket connections:

```typescript
// src/contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      const newSocket = io({
        auth: {
          sessionId: session.user.id
        }
      });

      newSocket.on('connect', () => setConnected(true));
      newSocket.on('disconnect', () => setConnected(false));

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [session]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### 2. Using the Socket Hook

```typescript
// src/hooks/useSocket.ts
import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}

export function useSocketEmit() {
  const { socket } = useSocket();

  return useCallback((event: string, data: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  }, [socket]);
}
```

### 3. Component Implementation Example

```typescript
// Example: Quick Notes Component
import React, { useState } from 'react';
import { useSocketEvent, useSocketEmit } from '@/hooks/useSocket';

interface QuickNote {
  id: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
}

export function QuickNotesComponent({ agentId }: { agentId: string }) {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const emit = useSocketEmit();

  // Listen for new notes
  useSocketEvent<QuickNote>('quickNote:created', (note) => {
    setNotes(prev => [...prev, note]);
  });

  // Create a new note
  const createNote = (content: string, priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    emit('quickNote:create', {
      agentId,
      content,
      priority,
      noteType: 'COACHING'
    });
  };

  return (
    <div>
      {/* UI implementation */}
    </div>
  );
}
```

## Event Reference

### Quick Notes Events

#### `quickNote:create` (Client → Server)
Create a new quick note.

**Payload:**
```typescript
{
  agentId: string;
  noteType: 'COACHING' | 'POSITIVE' | 'URGENT';
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: string;
}
```

#### `quickNote:created` (Server → Client)
Broadcast when a quick note is created.

**Payload:**
```typescript
{
  id: string;
  agentId: string;
  teamLeaderId: string;
  noteType: string;
  content: string;
  priority: string;
  category: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
}
```

### Action Items Events

#### `actionItem:create` (Client → Server)
Create a new action item.

**Payload:**
```typescript
{
  agentId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
}
```

#### `actionItem:created` (Server → Client)
Broadcast when an action item is created.

### Session Events

#### `join-session` (Client → Server)
Join a coaching session room.

**Payload:**
```typescript
{
  sessionId: string;
}
```

#### `leave-session` (Client → Server)
Leave a coaching session room.

**Payload:**
```typescript
{
  sessionId: string;
}
```

#### `session:update` (Client → Server)
Update session data in real-time.

**Payload:**
```typescript
{
  sessionId: string;
  updates: {
    discussionNotes?: string;
    topicsCovered?: string[];
    engagementScore?: number;
    // ... other session fields
  };
}
```

#### `session:updated` (Server → Client)
Broadcast session updates to all participants.

### Notification Events

#### `notification:send` (Client → Server)
Send a notification to a specific user.

**Payload:**
```typescript
{
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}
```

#### `notification` (Server → Client)
Receive a notification.

## Testing WebSockets

### 1. Using the Test Component

Navigate to `/test-websocket` in your browser to access the WebSocket test interface.

### 2. Manual Testing with Socket.io Client

```javascript
// In browser console
const socket = io('http://localhost:3000', {
  auth: {
    sessionId: 'your-session-id'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Test quick note creation
socket.emit('quickNote:create', {
  agentId: 'test-agent-id',
  noteType: 'COACHING',
  content: 'Test note',
  priority: 'HIGH'
});

// Listen for response
socket.on('quickNote:created', (data) => {
  console.log('Note created:', data);
});
```

### 3. Unit Testing

```typescript
// Example test using Jest
import { io, Socket } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';

describe('WebSocket Events', () => {
  let clientSocket: Socket;
  let serverSocket: Socket;
  let httpServer: any;
  let ioServer: Server;

  beforeAll((done) => {
    httpServer = createServer();
    ioServer = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = io(`http://localhost:${port}`);
      ioServer.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    ioServer.close();
    clientSocket.close();
  });

  test('should create quick note', (done) => {
    clientSocket.on('quickNote:created', (data) => {
      expect(data.content).toBe('Test note');
      done();
    });

    serverSocket.emit('quickNote:created', {
      id: '123',
      content: 'Test note',
      priority: 'HIGH'
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check if the server is running on the correct port
   - Verify authentication credentials
   - Check CORS configuration

2. **Events Not Received**
   - Ensure you're listening before emitting
   - Check event names match exactly
   - Verify room membership for room-based events

3. **Redis Connection Issues**
   - The app will fall back to in-memory adapter
   - Check Redis URL in environment variables
   - Ensure Redis server is running

### Debug Mode

Enable Socket.io debug mode:

```javascript
// Client
localStorage.debug = 'socket.io-client:*';

// Server
DEBUG=socket.io:* npm run dev
```

## Best Practices

### 1. Event Naming Convention
- Use namespace:action format (e.g., `quickNote:create`)
- Keep event names consistent and descriptive
- Document all events

### 2. Error Handling
```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Handle error appropriately
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Implement retry logic if needed
});
```

### 3. Type Safety
Define TypeScript interfaces for all events:

```typescript
// src/types/socket.ts
export interface SocketEvents {
  'quickNote:create': (data: QuickNoteCreateData) => void;
  'quickNote:created': (data: QuickNote) => void;
  // ... other events
}

// Use with typed socket
import { Socket } from 'socket.io-client';
type TypedSocket = Socket<SocketEvents>;
```

### 4. Performance Optimization
- Implement debouncing for frequent updates
- Use rooms for targeted broadcasting
- Batch multiple updates when possible
- Clean up listeners when components unmount

### 5. Security Considerations
- Always validate input on the server
- Implement rate limiting
- Use authentication middleware
- Sanitize data before broadcasting

## Migration from HTTP Polling

If migrating from HTTP polling to WebSockets:

1. Identify real-time requirements
2. Replace polling logic with socket events
3. Implement fallback for WebSocket failures
4. Update client state management
5. Test thoroughly with multiple clients

---

Last Updated: January 24, 2025
Version: 2.0