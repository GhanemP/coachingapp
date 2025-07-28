# API Route Standardization Framework

## Overview

This framework provides a standardized approach to building API routes in the SmartSource Coaching Hub application. It ensures consistent error handling, validation, authentication, authorization, caching, and logging across all API endpoints.

## Key Benefits

- **Consistent Error Handling**: Standardized error responses with proper HTTP status codes
- **Automatic Validation**: Request/response validation using Zod schemas
- **Built-in Security**: Authentication, authorization, and rate limiting
- **Performance Optimization**: Automatic caching and request optimization
- **Comprehensive Logging**: Structured logging with request tracking
- **Type Safety**: Full TypeScript support with proper type inference

## Architecture

### Core Components

1. **Types** (`types.ts`): TypeScript interfaces and enums
2. **Errors** (`errors.ts`): Error classes and response utilities
3. **Handler** (`handler.ts`): Main wrapper for route handlers
4. **Index** (`index.ts`): Public API exports

### Request Flow

```
Request → Rate Limiting → Authentication → Authorization → Validation → Handler → Response
```

## Usage

### Basic Example

```typescript
import { GET, createSuccessResponse, RequestContext } from '@/lib/api';
import { z } from 'zod';

// Define validation schema
const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => parseInt(val || '1')),
  limit: z
    .string()
    .optional()
    .transform(val => parseInt(val || '20')),
});

// Handler function
async function getItems(request: NextRequest, context: RequestContext) {
  const { searchParams } = new URL(request.url);
  const { page, limit } = querySchema.parse(Object.fromEntries(searchParams.entries()));

  // Your business logic here
  const items = await fetchItems(page, limit);

  return createSuccessResponse(items, 200, undefined, context.requestId);
}

// Export standardized handler
export const GET_HANDLER = GET(getItems, {
  auth: true,
  roles: [UserRole.ADMIN, UserRole.MANAGER],
  validation: {
    query: querySchema,
  },
  rateLimit: {
    requests: 100,
    window: 60 * 1000, // 1 minute
  },
});
```

### Advanced Configuration

```typescript
export const POST_HANDLER = POST(createItem, {
  auth: true,
  roles: [UserRole.ADMIN],
  validation: {
    body: createItemSchema,
    params: paramsSchema,
  },
  rateLimit: {
    requests: 10,
    window: 60 * 1000,
  },
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    key: (context, params) => `items-${context.user.id}-${params?.category}`,
  },
});
```

## Configuration Options

### RouteConfig Interface

```typescript
interface RouteConfig {
  auth?: boolean; // Require authentication (default: true)
  roles?: UserRole[]; // Required user roles
  rateLimit?: {
    // Rate limiting configuration
    requests: number; // Max requests
    window: number; // Time window in milliseconds
  };
  validation?: {
    // Request validation
    body?: z.ZodSchema; // Request body schema
    query?: z.ZodSchema; // Query parameters schema
    params?: z.ZodSchema; // Route parameters schema
  };
  cache?: {
    // Response caching
    ttl: number; // Time to live in milliseconds
    key?: (context, params) => string; // Custom cache key function
  };
}
```

## Error Handling

### Built-in Error Classes

```typescript
// Standard errors
throw new UnauthorizedError('Invalid credentials');
throw new ForbiddenError('Insufficient permissions');
throw new NotFoundError('Resource not found');
throw new ValidationError('Invalid input', validationDetails);
throw new RateLimitError('Too many requests');
throw new ConflictError('Resource already exists');

// Custom API error
throw new ApiError('Custom error', 400, ApiErrorCode.BAD_REQUEST);
```

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-v4"
}
```

## Response Formats

### Success Response

```json
{
  "data": {
    /* response data */
  },
  "message": "Optional success message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-v4"
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
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-v4"
}
```

## Validation

### Zod Schema Examples

```typescript
// Query parameters
const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => parseInt(val || '1')),
  limit: z
    .string()
    .optional()
    .transform(val => parseInt(val || '20')),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Request body
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
});

// Route parameters
const paramsSchema = z.object({
  id: z.string().uuid(),
});
```

## Authentication & Authorization

### Authentication

Authentication is enabled by default. Set `auth: false` to disable:

```typescript
export const GET_HANDLER = GET(publicHandler, {
  auth: false, // No authentication required
});
```

### Authorization

Specify required roles using the `roles` array:

```typescript
export const GET_HANDLER = GET(adminHandler, {
  roles: [UserRole.ADMIN], // Only admins can access
});

export const POST_HANDLER = POST(managerHandler, {
  roles: [UserRole.ADMIN, UserRole.MANAGER], // Admins or managers
});
```

## Rate Limiting

Configure rate limiting per endpoint:

```typescript
export const GET_HANDLER = GET(handler, {
  rateLimit: {
    requests: 100, // Max 100 requests
    window: 60 * 1000, // Per minute
  },
});
```

## Caching

### Automatic Caching

Enable caching for GET requests:

```typescript
export const GET_HANDLER = GET(handler, {
  cache: {
    ttl: 5 * 60 * 1000, // Cache for 5 minutes
  },
});
```

### Custom Cache Keys

Provide custom cache key generation:

```typescript
export const GET_HANDLER = GET(handler, {
  cache: {
    ttl: 5 * 60 * 1000,
    key: (context, params) => `users-${context.user.role}-${params?.department}`,
  },
});
```

## Logging

All requests are automatically logged with:

- Request method and path
- Response status and duration
- User ID and request ID
- Error details (if applicable)

### Custom Logging

Access the logger in your handler:

```typescript
import logger from '@/lib/logger';

async function handler(request: NextRequest, context: RequestContext) {
  logger.info('Processing request', {
    userId: context.user.id,
    requestId: context.requestId,
  });

  // Your logic here
}
```

## Migration Guide

### From Old Pattern

```typescript
// OLD: Manual error handling
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Business logic
    const data = await fetchData();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### To New Pattern

```typescript
// NEW: Standardized handler
import { GET, createSuccessResponse } from '@/lib/api';

async function getData(request: NextRequest, context: RequestContext) {
  const data = await fetchData();
  return createSuccessResponse(data, 200, undefined, context.requestId);
}

export const GET_HANDLER = GET(getData, {
  auth: true,
  roles: [UserRole.USER],
});
```

## Best Practices

1. **Always use validation schemas** for request data
2. **Implement proper error handling** with specific error types
3. **Use appropriate HTTP status codes** for responses
4. **Enable caching** for read-heavy endpoints
5. **Set reasonable rate limits** to prevent abuse
6. **Log important business events** for debugging
7. **Use TypeScript interfaces** for response data
8. **Test error scenarios** thoroughly

## Testing

### Unit Testing

```typescript
import { createMockContext } from '@/lib/api/test-utils';

describe('API Handler', () => {
  it('should return success response', async () => {
    const context = createMockContext({
      user: { id: '1', role: UserRole.ADMIN },
    });

    const response = await handler(mockRequest, context);
    expect(response.status).toBe(200);
  });
});
```

### Integration Testing

```typescript
import { testApiRoute } from '@/lib/api/test-utils';

describe('GET /api/users', () => {
  it('should require authentication', async () => {
    const response = await testApiRoute('GET', '/api/users');
    expect(response.status).toBe(401);
  });
});
```

## Performance Considerations

1. **Caching**: Use appropriate TTL values based on data freshness requirements
2. **Rate Limiting**: Set limits based on expected usage patterns
3. **Validation**: Keep schemas simple and efficient
4. **Database Queries**: Use proper indexing and query optimization
5. **Response Size**: Implement pagination for large datasets

## Security Features

1. **Authentication**: JWT-based session validation
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Prevent abuse and DoS attacks
4. **Input Validation**: Prevent injection attacks
5. **Security Headers**: Automatic security header injection
6. **Request Logging**: Audit trail for security monitoring

This standardization framework ensures consistent, secure, and maintainable API endpoints across the entire application.
