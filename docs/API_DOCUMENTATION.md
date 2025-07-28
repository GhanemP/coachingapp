# SmartSource Coaching Hub API Documentation

## Overview

The SmartSource Coaching Hub API is a comprehensive RESTful API that powers a coaching management platform. It enables organizations to manage coaching sessions, track performance metrics, facilitate agent development, and maintain comprehensive audit trails.

## 🚀 Quick Start

### Base URLs

- **Development**: `http://localhost:3000`
- **Production**: `https://coaching-hub.smartsource.com`

### Interactive Documentation

- **Swagger UI**: `/api/docs` - Interactive API explorer
- **OpenAPI Spec**: `/api/docs/spec` - Raw OpenAPI 3.0 specification

### Authentication

All API endpoints require authentication via NextAuth.js session cookies or JWT Bearer tokens.

```bash
# Using session cookie (browser)
curl -H "Cookie: next-auth.session-token=your-session-token" \
     https://api.example.com/api/users

# Using JWT Bearer token
curl -H "Authorization: Bearer your-jwt-token" \
     https://api.example.com/api/users
```

## 📋 Core Features

### 🔐 Authentication & Authorization

- **Role-based Access Control**: Admin, Manager, Team Leader, Agent
- **Session Management**: NextAuth.js integration
- **JWT Support**: Bearer token authentication
- **Password Security**: bcrypt hashing with salt

### 👥 User Management

- **User CRUD Operations**: Create, read, update, delete users
- **Role Assignment**: Flexible role-based permissions
- **Profile Management**: User profiles with metadata
- **Team Hierarchy**: Manager → Team Leader → Agent relationships

### 🎯 Coaching Sessions

- **Session Scheduling**: Plan and schedule coaching sessions
- **Session Management**: Track session progress and outcomes
- **Performance Scoring**: Before/after performance metrics
- **Session Notes**: Detailed session documentation

### ✅ Action Items & Plans

- **Action Item Tracking**: Create and manage improvement tasks
- **Action Plans**: Comprehensive development plans
- **Priority Management**: Urgent, High, Medium, Low priorities
- **Progress Tracking**: Status updates and completion tracking

### 📝 Quick Notes

- **Real-time Notes**: Quick observations and feedback
- **Categorization**: Performance, Behavior, Training, General
- **Privacy Controls**: Public/private note visibility
- **Role-based Access**: Filtered by user permissions

### 📊 Performance Metrics

- **Agent Scorecards**: Comprehensive performance tracking
- **Historical Data**: Time-series performance analysis
- **Metric Categories**: Service, Productivity, Quality, Adherence
- **Export Capabilities**: CSV/Excel data export

## 🔧 API Endpoints

### Authentication Endpoints

#### POST `/api/auth/login`

Authenticate user with credentials.

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### POST `/api/auth/register`

Register a new user account.

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "AGENT"
}
```

#### POST `/api/auth/signout-custom`

Sign out current user session.

### User Management

#### GET `/api/users`

Retrieve paginated list of users.

**Query Parameters:**

- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10, max: 100)
- `role` (string): Filter by user role
- `search` (string): Search by name or email

**Response:**

```json
{
  "users": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "AGENT",
      "employeeId": "EMP001",
      "department": "Sales",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET `/api/users/[id]`

Retrieve specific user by ID.

#### PUT `/api/users/[id]`

Update user information.

#### DELETE `/api/users/[id]`

Deactivate user account.

### Agent Management

#### GET `/api/agents`

Retrieve list of agents with performance metrics.

**Query Parameters:**

- `supervised` (boolean): Filter by supervised agents (Team Leaders only)

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "employeeId": "EMP002",
    "averageScore": 85.5,
    "metricsCount": 6,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET `/api/agents/[id]`

Retrieve specific agent details.

#### GET `/api/agents/[id]/metrics`

Retrieve agent performance metrics.

#### GET `/api/agents/[id]/scorecard`

Retrieve agent scorecard data.

### Coaching Sessions

#### GET `/api/sessions`

Retrieve coaching sessions.

**Query Parameters:**

- `agentId` (string): Filter by agent
- `status` (string): Filter by session status
- `startDate` (string): Filter by date range
- `endDate` (string): Filter by date range

#### POST `/api/sessions`

Create new coaching session.

```json
{
  "agentId": "uuid",
  "scheduledDate": "2024-01-15T10:00:00.000Z",
  "duration": 60,
  "preparationNotes": "Focus on call handling techniques"
}
```

#### GET `/api/sessions/[id]`

Retrieve specific session details.

#### PUT `/api/sessions/[id]`

Update session information.

#### PUT `/api/sessions/[id]/status`

Update session status.

### Action Items

#### GET `/api/action-items`

Retrieve action items.

**Query Parameters:**

- `agentId` (string): Filter by agent
- `status` (string): Filter by status
- `priority` (string): Filter by priority

#### POST `/api/action-items`

Create new action item.

```json
{
  "agentId": "uuid",
  "title": "Improve call resolution time",
  "description": "Focus on first-call resolution techniques",
  "priority": "HIGH",
  "dueDate": "2024-01-30T00:00:00.000Z"
}
```

#### PUT `/api/action-items/[id]`

Update action item.

#### DELETE `/api/action-items/[id]`

Delete action item.

### Action Plans

#### GET `/api/action-plans`

Retrieve action plans.

#### POST `/api/action-plans`

Create new action plan.

```json
{
  "agentId": "uuid",
  "title": "Q1 Performance Improvement Plan",
  "description": "Comprehensive plan to improve overall performance",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-03-31T00:00:00.000Z"
}
```

#### GET `/api/action-plans/[id]`

Retrieve specific action plan.

#### PUT `/api/action-plans/[id]`

Update action plan.

### Quick Notes

#### GET `/api/quick-notes`

Retrieve quick notes.

**Query Parameters:**

- `agentId` (string): Filter by agent
- `category` (string): Filter by category
- `search` (string): Search note content

#### POST `/api/quick-notes`

Create new quick note.

```json
{
  "agentId": "uuid",
  "content": "Excellent customer interaction today",
  "category": "PERFORMANCE",
  "isPrivate": false
}
```

#### PUT `/api/quick-notes/[id]`

Update quick note.

#### DELETE `/api/quick-notes/[id]`

Delete quick note.

### System Endpoints

#### GET `/api/health`

System health check.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

#### GET `/api/monitoring/database`

Database performance monitoring.

## 🔒 Security Features

### Rate Limiting

- **General Endpoints**: 100 requests per minute per IP
- **Authentication**: 5 requests per minute per IP
- **File Uploads**: 10 requests per minute per IP

### Data Protection

- **Encryption**: AES-256 encryption for sensitive data
- **Password Hashing**: bcrypt with salt
- **HTTPS Only**: Production enforces HTTPS
- **CORS Protection**: Configured for specific origins

### Audit Logging

All API operations are logged with:

- User identification
- Action performed
- Resource affected
- Timestamp
- IP address
- User agent

## 📊 Response Formats

### Success Response

```json
{
  "data": {
    /* response data */
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users",
  "details": {
    "email": "Invalid email format",
    "name": "Name is required"
  }
}
```

### Paginated Response

```json
{
  "data": [
    /* array of items */
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🚨 Error Codes

| Code | Description           | Common Causes                            |
| ---- | --------------------- | ---------------------------------------- |
| 400  | Bad Request           | Invalid input data, malformed JSON       |
| 401  | Unauthorized          | Missing or invalid authentication        |
| 403  | Forbidden             | Insufficient permissions                 |
| 404  | Not Found             | Resource doesn't exist                   |
| 409  | Conflict              | Duplicate resource, constraint violation |
| 422  | Unprocessable Entity  | Validation errors                        |
| 429  | Too Many Requests     | Rate limit exceeded                      |
| 500  | Internal Server Error | Server-side error                        |

## 🔧 Development Tools

### Testing the API

#### Using cURL

```bash
# Get all users
curl -X GET "http://localhost:3000/api/users" \
     -H "Cookie: next-auth.session-token=your-token"

# Create a quick note
curl -X POST "http://localhost:3000/api/quick-notes" \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=your-token" \
     -d '{
       "agentId": "uuid",
       "content": "Great performance today",
       "category": "PERFORMANCE"
     }'
```

#### Using Postman

1. Import the OpenAPI specification from `/api/docs/spec`
2. Set up authentication with session cookies or JWT
3. Use the generated collection for testing

### SDK Generation

The OpenAPI specification can be used to generate SDKs for various languages:

```bash
# Generate JavaScript SDK
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api/docs/spec \
  -g javascript \
  -o ./sdk/javascript

# Generate Python SDK
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api/docs/spec \
  -g python \
  -o ./sdk/python
```

## 📈 Performance Considerations

### Caching Strategy

- **Redis Caching**: Frequently accessed data cached for 5-30 minutes
- **Database Query Optimization**: Indexed queries and connection pooling
- **CDN Integration**: Static assets served via CDN

### Monitoring

- **Sentry Integration**: Error tracking and performance monitoring
- **Database Monitoring**: Query performance and connection health
- **Real-time Metrics**: WebSocket connections for live updates

## 🔄 Versioning

The API follows semantic versioning (SemVer):

- **Major Version**: Breaking changes
- **Minor Version**: New features, backward compatible
- **Patch Version**: Bug fixes, backward compatible

Current version: **v1.0.0**

## 📞 Support

For API support and questions:

- **Documentation**: Visit `/api/docs` for interactive documentation
- **GitHub Issues**: Report bugs and feature requests
- **Email**: dev@smartsource.com

## 📝 Changelog

### v1.0.0 (2024-01-01)

- Initial API release
- Complete user management system
- Coaching session management
- Action items and plans
- Quick notes system
- Performance metrics tracking
- Real-time notifications
- Comprehensive security features

---

_This documentation is automatically generated from the OpenAPI specification. For the most up-to-date information, visit the interactive documentation at `/api/docs`._
