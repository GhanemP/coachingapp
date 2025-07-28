import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { getSession } from '@/lib/auth-server';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { getCache, setCache } from '@/lib/redis';
import { rateLimiter, securityHeaders } from '@/lib/security';

import {
  createErrorResponse,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError
} from './errors';
import {
  ApiHandler,
  RouteConfig,
  RequestContext,
  HttpMethod,
  HttpStatus
} from './types';

export function createApiHandler(
  method: HttpMethod,
  handler: ApiHandler,
  config: RouteConfig = {}
) {
  return async function(
    request: NextRequest,
    { params }: { params?: Record<string, string> } = {}
  ): Promise<NextResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Create request context
      const context = await createRequestContext(request, requestId);
      
      // Apply rate limiting
      if (config.rateLimit) {
        applyRateLimit(request, config.rateLimit);
      }
      
      // Apply authentication
      if (config.auth !== false) {
        applyAuthentication(context);
      }
      
      // Apply authorization
      if (config.roles && config.roles.length > 0) {
        applyAuthorization(context, config.roles);
      }
      
      // Apply validation
      if (config.validation) {
        await applyValidation(request, config.validation, params);
      }
      
      // Check cache
      if (config.cache && method === 'GET') {
        const cachedResponse = await checkCache(config.cache, context, params);
        if (cachedResponse) {
          return cachedResponse;
        }
      }
      
      // Execute handler
      const response = await handler(request, context, params);
      
      // Cache response if configured
      if (config.cache && method === 'GET' && response.status === HttpStatus.OK) {
        await cacheResponse(config.cache, context, params, response);
      }
      
      // Add security headers
      const headers = new Headers(response.headers);
      Object.entries(securityHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      // Log successful request
      const duration = Date.now() - startTime;
      logger.info('API Request completed', {
        method,
        path: request.nextUrl.pathname,
        status: response.status.toString(),
        duration,
        requestId,
        userId: context.user?.id
      });
      
      return new NextResponse(response.body, {
        status: response.status,
        headers
      });
      
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      logger.error('API Request failed', error as Error, {
        method,
        path: request.nextUrl.pathname,
        duration,
        requestId
      });
      
      return createErrorResponse(error, requestId);
    }
  };
}

async function createRequestContext(
  request: NextRequest,
  requestId: string
): Promise<RequestContext> {
  const session = await getSession();
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;
  
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role as UserRole,
      name: session.user.name
    },
    requestId,
    timestamp: new Date(),
    ip,
    userAgent
  };
}

function applyRateLimit(
  request: NextRequest,
  _rateLimit: { requests: number; window: number }
): void {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `${request.nextUrl.pathname}:${ip}`;
  
  if (!rateLimiter.isAllowed(key)) {
    throw new RateLimitError();
  }
}

function applyAuthentication(context: RequestContext): void {
  if (!context.user) {
    throw new UnauthorizedError();
  }
}

function applyAuthorization(
  context: RequestContext,
  allowedRoles: UserRole[]
): void {
  if (!allowedRoles.includes(context.user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

async function applyValidation(
  request: NextRequest,
  validation: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  },
  params?: Record<string, string>
): Promise<void> {
  // Validate request body
  if (validation.body) {
    const body = await request.json().catch(() => ({}));
    const result = validation.body.safeParse(body);
    if (!result.success) {
      throw result.error;
    }
  }
  
  // Validate query parameters
  if (validation.query) {
    const searchParams = request.nextUrl.searchParams;
    const query = Object.fromEntries(searchParams.entries());
    const result = validation.query.safeParse(query);
    if (!result.success) {
      throw result.error;
    }
  }
  
  // Validate route parameters
  if (validation.params && params) {
    const result = validation.params.safeParse(params);
    if (!result.success) {
      throw result.error;
    }
  }
}

async function checkCache(
  cache: { ttl: number; key?: (context: RequestContext, params?: Record<string, unknown>) => string },
  context: RequestContext,
  params?: Record<string, string>
): Promise<NextResponse | null> {
  try {
    const cacheKey = cache.key 
      ? cache.key(context, params) 
      : `api:${context.requestId}`;
    
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
  } catch (error) {
    // Cache errors should not break the request
    logger.warn('Cache check failed', { error: error as Error });
  }
  
  return null;
}

async function cacheResponse(
  cache: { ttl: number; key?: (context: RequestContext, params?: Record<string, unknown>) => string },
  context: RequestContext,
  params: Record<string, string> | undefined,
  response: NextResponse
): Promise<void> {
  try {
    const cacheKey = cache.key 
      ? cache.key(context, params) 
      : `api:${context.requestId}`;
    
    const responseData = await response.clone().json();
    await setCache(cacheKey, responseData, cache.ttl);
  } catch (error) {
    // Cache errors should not break the request
    logger.warn('Cache set failed', { error: error as Error });
  }
}

// Convenience functions for common HTTP methods
export const GET = (handler: ApiHandler, config?: RouteConfig) => 
  createApiHandler('GET', handler, config);

export const POST = (handler: ApiHandler, config?: RouteConfig) => 
  createApiHandler('POST', handler, config);

export const PUT = (handler: ApiHandler, config?: RouteConfig) => 
  createApiHandler('PUT', handler, config);

export const PATCH = (handler: ApiHandler, config?: RouteConfig) => 
  createApiHandler('PATCH', handler, config);

export const DELETE = (handler: ApiHandler, config?: RouteConfig) => 
  createApiHandler('DELETE', handler, config);