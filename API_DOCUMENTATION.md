# Coach App v2 API Documentation

## Overview

This document provides comprehensive API documentation for the Coach App v2, including all REST endpoints, WebSocket events, and AI-powered features.

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [Core API Endpoints](#core-api-endpoints)
4. [WebSocket Events](#websocket-events)
5. [AI-Powered Endpoints](#ai-powered-endpoints)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

## Base Configuration

### Base URL

```
Development: http://localhost:3000/api
Production: https://api.coaching-system.com/api
```

### Authentication

All API requests require authentication via NextAuth.js session cookies or JWT tokens.

```typescript
// Cookie-based (default)
Cookie: next-auth.session-token=<session_token>

// JWT Bearer token (for external clients)
Authorization: Bearer <jwt_token>
```

### Standard Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-24T10:30:00Z",
    "version": "2.0"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Authentication

### NextAuth.js Configuration

The application uses NextAuth.js for authentication with the following providers:

- Credentials (email/password)
- OAuth providers (configurable)

### Session Structure

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'TEAM_LEADER' | 'AGENT';
  };
  expires: string;
}
```

## Core API Endpoints

### User Management

#### GET /api/users

Get list of users with filtering and pagination.

**Query Parameters:**

- `role`: Filter by user role
- `status`: Filter by status (ACTIVE, INACTIVE, PIP)
- `team_leader_id`: Filter by team leader
- `search`: Search by name or email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "AGENT",
      "status": "ACTIVE",
      "teamLeader": {
        "id": "uuid",
        "name": "Team Leader Name"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Quick Notes

#### GET /api/quick-notes

Get quick notes with filtering.

**Query Parameters:**

- `agentId`: Filter by agent
- `teamLeaderId`: Filter by team leader
- `addressed`: Filter by addressed status
- `noteType`: Filter by type (COACHING, POSITIVE, URGENT)
- `priority`: Filter by priority (LOW, MEDIUM, HIGH)
- `startDate`: Start date for date range
- `endDate`: End date for date range

#### POST /api/quick-notes

Create a new quick note.

**Request Body:**

```json
{
  "agentId": "uuid",
  "noteType": "COACHING",
  "category": "Call Quality",
  "content": "Needs improvement in call handling",
  "priority": "MEDIUM",
  "requiresFollowUp": true
}
```

### Action Items

#### GET /api/action-items

Get action items with filtering.

**Query Parameters:**

- `agentId`: Filter by agent
- `sessionId`: Filter by session
- `status`: Filter by status (PENDING, IN_PROGRESS, COMPLETED, OVERDUE)
- `priority`: Filter by priority
- `assignedBy`: Filter by assigner

#### POST /api/action-items

Create a new action item.

**Request Body:**

```json
{
  "agentId": "uuid",
  "sessionId": "uuid",
  "title": "Complete training module",
  "description": "Focus on customer service skills",
  "category": "TRAINING",
  "dueDate": "2025-02-01",
  "priority": "HIGH"
}
```

### Coaching Sessions

#### GET /api/coaching/sessions

Get coaching sessions with filtering.

#### POST /api/coaching/sessions

Create a new coaching session.

#### PATCH /api/coaching/sessions/:id

Update a coaching session.

#### POST /api/coaching/sessions/:id/complete

Complete a coaching session.

## WebSocket Events

The application uses Socket.io for real-time communication. Connect to the WebSocket server at the same base URL as your application.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    sessionId: 'your-session-id',
  },
});
```

### Events

#### Quick Notes

```typescript
// Create a quick note (client -> server)
socket.emit('quickNote:create', {
  agentId: 'uuid',
  noteType: 'COACHING',
  content: 'Note content',
  priority: 'HIGH',
});

// Quick note created (server -> client)
socket.on('quickNote:created', data => {
  console.log('New quick note:', data);
});
```

#### Action Items

```typescript
// Create action item (client -> server)
socket.emit('actionItem:create', {
  agentId: 'uuid',
  title: 'Action item title',
  dueDate: '2025-02-01',
});

// Action item created (server -> client)
socket.on('actionItem:created', data => {
  console.log('New action item:', data);
});
```

#### Notifications

```typescript
// Send notification (client -> server)
socket.emit('notification:send', {
  userId: 'uuid',
  type: 'info',
  message: 'Notification message',
});

// Receive notification (server -> client)
socket.on('notification', data => {
  console.log('Notification:', data);
});
```

#### Session Updates

```typescript
// Join session room (client -> server)
socket.emit('join-session', { sessionId: 'uuid' });

// Leave session room (client -> server)
socket.emit('leave-session', { sessionId: 'uuid' });

// Session update (client -> server)
socket.emit('session:update', {
  sessionId: 'uuid',
  updates: {
    discussionNotes: 'Updated notes...',
  },
});

// Session updated (server -> client)
socket.on('session:updated', data => {
  console.log('Session updated:', data);
});
```

## AI-Powered Endpoints

All AI endpoints require authentication and appropriate role permissions (TEAM_LEADER or MANAGER).

### POST /api/ai/recommendations

Generate AI-powered coaching recommendations.

**Request Body:**

```json
{
  "agentId": "uuid",
  "context": {
    "recentPerformance": {
      "qualityScore": 75,
      "productivityScore": 85,
      "attendanceRate": 95
    },
    "specificIssues": ["Call handling", "Product knowledge"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "area": "Call Handling",
        "priority": "HIGH",
        "suggestion": "Focus on active listening techniques",
        "actionItems": ["Practice summarizing customer concerns", "Use empathy statements"],
        "resources": ["Call Handling Best Practices Guide"]
      }
    ],
    "overallStrategy": "Prioritize call handling improvements while maintaining current productivity levels"
  }
}
```

### POST /api/ai/session-insights

Get AI insights for a coaching session.

**Request Body:**

```json
{
  "sessionId": "uuid",
  "includeHistorical": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "insights": {
      "keyThemes": ["Time management", "Customer empathy"],
      "progressSummary": "Agent showing improvement in quality metrics",
      "suggestedFocus": "Continue reinforcing positive behaviors",
      "riskFactors": ["Potential burnout signs detected"],
      "successPrediction": 0.78
    }
  }
}
```

### POST /api/ai/action-items

Generate AI-suggested action items.

**Request Body:**

```json
{
  "agentId": "uuid",
  "sessionNotes": "Discussion about call handling and product knowledge gaps",
  "performanceContext": {
    "weakAreas": ["Product knowledge", "Call control"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestedActions": [
      {
        "title": "Complete product knowledge assessment",
        "description": "Focus on new product features launched this quarter",
        "category": "TRAINING",
        "priority": "HIGH",
        "estimatedDuration": "2 hours",
        "dueDate": "2025-02-01"
      }
    ]
  }
}
```

### GET /api/ai/performance/:agentId/summary

Get AI-generated performance summary.

**Query Parameters:**

- `period`: Time period (7d, 30d, 90d)
- `includeRecommendations`: Include AI recommendations (boolean)

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "overallTrend": "IMPROVING",
      "strengths": ["Customer satisfaction", "Attendance"],
      "improvements": ["Call duration", "First call resolution"],
      "keyInsights": [
        "Performance improved after recent training",
        "Shows potential for leadership role"
      ],
      "predictedTrajectory": "Likely to meet quarterly targets",
      "recommendedInterventions": ["Advanced product training", "Peer mentoring opportunity"]
    }
  }
}
```

## Error Handling

### Error Codes

```typescript
enum ErrorCodes {
  // Authentication
  AUTH_UNAUTHORIZED = 'AUTH_001',
  AUTH_FORBIDDEN = 'AUTH_002',
  AUTH_SESSION_EXPIRED = 'AUTH_003',

  // Validation
  VALIDATION_ERROR = 'VAL_001',
  MISSING_REQUIRED_FIELD = 'VAL_002',
  INVALID_FORMAT = 'VAL_003',

  // Business Logic
  RESOURCE_NOT_FOUND = 'BIZ_001',
  DUPLICATE_ENTRY = 'BIZ_002',
  INVALID_STATE = 'BIZ_003',

  // AI Service
  AI_SERVICE_ERROR = 'AI_001',
  AI_RATE_LIMIT = 'AI_002',
  AI_INVALID_CONTEXT = 'AI_003',

  // System
  INTERNAL_ERROR = 'SYS_001',
  DATABASE_ERROR = 'SYS_002',
  EXTERNAL_SERVICE_ERROR = 'SYS_003',
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "agentId",
      "issue": "Agent not found"
    }
  }
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute
- **AI endpoints**: 20 requests per minute
- **WebSocket events**: 50 events per minute

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706437200
```

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

## Environment Variables

Required environment variables for full functionality:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Redis (optional, for scalability)
REDIS_URL="redis://localhost:6379"

# AI Service
OPENAI_API_KEY="your-openai-api-key"
```

## Testing

### WebSocket Testing

Use the provided test component at `/test-websocket` to verify WebSocket functionality.

### AI Endpoint Testing

Use the test script:

```bash
npm run test:ai-endpoints
```

## Migration Notes

When migrating from v1:

1. Update authentication to use NextAuth.js sessions
2. Update WebSocket client code to use new event names
3. Add error handling for new error codes
4. Update role-based access checks for AI endpoints

---

Last Updated: January 24, 2025
Version: 2.0
