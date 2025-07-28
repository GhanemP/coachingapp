import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger, LogContext } from '@/lib/simple-logger';

// Request logging middleware
export function withRequestLogging(
  handler: (req: NextRequest, context: LogContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const logger = createRequestLogger(req);
    
    // Generate request ID if not present
    const requestId = req.headers.get('x-request-id') || 
                     Math.random().toString(36).substring(7);
    
    const context: LogContext = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent') || 'unknown',
      ip: req.headers.get('x-forwarded-for') || 
          req.headers.get('x-real-ip') || 
          'unknown',
    };

    // Log incoming request
    logger.http(`${req.method} ${req.url} - Request started`, context);

    try {
      // Execute the handler
      const response = await handler(req, context);
      
      const duration = Date.now() - startTime;
      const statusCode = response.status;

      // Log successful response
      logger.http(
        `${req.method} ${req.url} - ${statusCode} (${duration}ms)`,
        { ...context, statusCode, duration }
      );

      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      logger.error(
        `${req.method} ${req.url} - Error after ${duration}ms`,
        error as Error,
        { ...context, duration }
      );
      
      // Return error response
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 500,
          headers: { 'x-request-id': requestId }
        }
      );
    }
  };
}

// Error boundary for API routes
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const logger = createRequestLogger(args[0] as NextRequest);
      
      // Log the error
      logger.error('Unhandled API error', error as Error);
      
      // Return standardized error response
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: process.env['NODE_ENV'] === 'development' 
            ? (error as Error).message 
            : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends unknown[]>(
  operationName: string,
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const logger = createRequestLogger(args[0] as NextRequest);
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      // Log performance metrics
      logger.performance(operationName, duration);
      
      // Add performance headers
      result.headers.set('x-response-time', `${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${operationName} failed after ${duration}ms`, error as Error);
      throw error;
    }
  };
}

// Rate limiting logging
export function logRateLimit(
  req: NextRequest,
  limit: number,
  remaining: number,
  resetTime: Date
): void {
  const logger = createRequestLogger(req);
  
  if (remaining <= 0) {
    logger.warn('Rate limit exceeded', {
      limit,
      remaining,
      resetTime: resetTime.toISOString(),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
  } else if (remaining <= limit * 0.1) {
    logger.info('Rate limit warning', {
      limit,
      remaining,
      resetTime: resetTime.toISOString(),
    });
  }
}

// Authentication logging
export function logAuthEvent(
  req: NextRequest,
  event: string,
  userId?: string,
  success: boolean = true
): void {
  const logger = createRequestLogger(req);
  
  if (success) {
    logger.auth(event, userId);
  } else {
    logger.security(`Failed ${event}`, 'medium', {
      userId,
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });
  }
}

// Database operation logging
export async function logDatabaseOperation<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
  req?: NextRequest
): Promise<T> {
  const startTime = Date.now();
  const logger = req ? createRequestLogger(req) : createRequestLogger({} as NextRequest);
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.database(operation, table, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Database ${operation} on ${table} failed after ${duration}ms`, error as Error);
    throw error;
  }
}