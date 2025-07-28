import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SmartSource Coaching Hub API',
    version: '1.0.0',
    description: `
# SmartSource Coaching Hub API Documentation

A comprehensive coaching management platform API that enables organizations to manage coaching sessions, track performance metrics, and facilitate agent development.

## Features
- **User Management**: Role-based access control (Admin, Manager, Team Leader, Agent)
- **Coaching Sessions**: Schedule, conduct, and track coaching sessions
- **Performance Metrics**: Track and analyze agent performance data
- **Action Plans**: Create and manage improvement plans
- **Real-time Notifications**: WebSocket-based real-time updates
- **Audit Logging**: Comprehensive security and activity tracking

## Authentication
All API endpoints require authentication via NextAuth.js session cookies or JWT tokens.

## Rate Limiting
API endpoints are rate-limited to prevent abuse:
- General endpoints: 100 requests per minute
- Authentication endpoints: 5 requests per minute
- File upload endpoints: 10 requests per minute

## Error Handling
All endpoints return standardized error responses with appropriate HTTP status codes and detailed error messages.
    `,
    contact: {
      name: 'SmartSource Development Team',
      email: 'dev@smartsource.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://coaching-hub.smartsource.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
        description: 'NextAuth.js session cookie',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: {
            type: 'string',
            enum: ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'AGENT'],
          },
          employeeId: { type: 'string' },
          department: { type: 'string' },
          managedBy: { type: 'string', format: 'uuid', nullable: true },
          teamLeaderId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'email', 'role'],
      },
      CoachingSession: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agentId: { type: 'string', format: 'uuid' },
          teamLeaderId: { type: 'string', format: 'uuid' },
          sessionDate: { type: 'string', format: 'date-time' },
          scheduledDate: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', minimum: 1 },
          status: {
            type: 'string',
            enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
          },
          sessionNotes: { type: 'string' },
          preparationNotes: { type: 'string' },
          actionItems: { type: 'string' },
          previousScore: { type: 'number', minimum: 0, maximum: 100 },
          currentScore: { type: 'number', minimum: 0, maximum: 100 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'agentId', 'teamLeaderId', 'sessionDate', 'status'],
      },
      ActionItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agentId: { type: 'string', format: 'uuid' },
          sessionId: { type: 'string', format: 'uuid', nullable: true },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
          },
          dueDate: { type: 'string', format: 'date-time' },
          completedDate: { type: 'string', format: 'date-time', nullable: true },
          createdBy: { type: 'string', format: 'uuid' },
          assignedTo: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'agentId', 'title', 'priority', 'status', 'createdBy', 'assignedTo'],
      },
      ActionPlan: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agentId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
          },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string', format: 'uuid' },
          approvedBy: { type: 'string', format: 'uuid', nullable: true },
          approvedDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'agentId', 'title', 'status', 'startDate', 'endDate', 'createdBy'],
      },
      QuickNote: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agentId: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          category: {
            type: 'string',
            enum: ['PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'GENERAL'],
          },
          isPrivate: { type: 'boolean' },
          createdBy: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'agentId', 'content', 'category', 'createdBy'],
      },
      PerformanceMetric: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sessionId: { type: 'string', format: 'uuid' },
          metricName: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          comments: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'sessionId', 'metricName', 'score'],
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' },
          details: { type: 'object' },
        },
        required: ['error', 'message', 'statusCode'],
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1 },
              limit: { type: 'integer', minimum: 1 },
              total: { type: 'integer', minimum: 0 },
              totalPages: { type: 'integer', minimum: 0 },
              hasNext: { type: 'boolean' },
              hasPrev: { type: 'boolean' },
            },
            required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
          },
        },
        required: ['data', 'pagination'],
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Unauthorized',
              message: 'Authentication required',
              statusCode: 401,
              timestamp: '2024-01-01T00:00:00.000Z',
              path: '/api/users',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Forbidden',
              message: 'Insufficient permissions to access this resource',
              statusCode: 403,
              timestamp: '2024-01-01T00:00:00.000Z',
              path: '/api/admin/users',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Not Found',
              message: 'The requested resource was not found',
              statusCode: 404,
              timestamp: '2024-01-01T00:00:00.000Z',
              path: '/api/users/123',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Validation Error',
              message: 'Invalid input data',
              statusCode: 400,
              timestamp: '2024-01-01T00:00:00.000Z',
              path: '/api/users',
              details: {
                email: 'Invalid email format',
                name: 'Name is required',
              },
            },
          },
        },
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              statusCode: 429,
              timestamp: '2024-01-01T00:00:00.000Z',
              path: '/api/auth/login',
            },
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Sort field and direction (e.g., "createdAt:desc")',
        required: false,
        schema: { type: 'string' },
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: 'Search query string',
        required: false,
        schema: { type: 'string' },
      },
    },
  },
  security: [{ sessionAuth: [] }, { bearerAuth: [] }],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Coaching Sessions',
      description: 'Coaching session management',
    },
    {
      name: 'Action Items',
      description: 'Action item tracking and management',
    },
    {
      name: 'Action Plans',
      description: 'Action plan creation and management',
    },
    {
      name: 'Quick Notes',
      description: 'Quick note management',
    },
    {
      name: 'Performance Metrics',
      description: 'Performance tracking and analytics',
    },
    {
      name: 'Notifications',
      description: 'Real-time notification system',
    },
    {
      name: 'Admin',
      description: 'Administrative operations',
    },
    {
      name: 'Health',
      description: 'System health and monitoring',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/app/api/**/*.ts', './src/lib/api/**/*.ts', './docs/api-examples.yaml'],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
