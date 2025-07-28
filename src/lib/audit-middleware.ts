/**
 * Audit Middleware
 * Integrates audit logging with API routes and application events
 */

import { NextRequest, NextResponse } from 'next/server';

import { auditLogger, AuditEventType, AuditRiskLevel, AuditContext } from './audit-logger';
// import { getEnvVar } from './type-utils'; // Unused import

/**
 * Extract audit context from request
 */
export function extractAuditContext(request: NextRequest, userId?: string): AuditContext {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress = forwarded?.split(',')[0] || realIp || 'unknown';
  
  const context: AuditContext = {};
  
  if (userId) {context.userId = userId;}
  
  const sessionId = request.cookies.get('next-auth.session-token')?.value;
  if (sessionId) {context.sessionId = sessionId;}
  
  if (ipAddress && ipAddress !== 'unknown') {context.ipAddress = ipAddress;}
  
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {context.userAgent = userAgent;}
  
  context.requestId = request.headers.get('x-request-id') || generateRequestId();
  
  const correlationId = request.headers.get('x-correlation-id');
  if (correlationId) {context.correlationId = correlationId;}
  
  return context;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Audit middleware for API routes
 */
export function withAudit<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    eventType?: AuditEventType;
    resource?: string;
    requireAuth?: boolean;
    sensitiveFields?: string[];
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    let auditContext: AuditContext;
    let userId: string   | undefined;
    let response: NextResponse;
    let error: Error | null = null;

    try {
      // Skip authentication check for now - can be added later
      // This allows the audit system to work without auth dependencies

      auditContext = extractAuditContext(request, userId);

      // Log request start
      if (options.eventType) {
        await auditLogger.logEvent(
          options.eventType,
          auditContext,
          {
            method: request.method,
            path: request.nextUrl.pathname,
            query: Object.fromEntries(request.nextUrl.searchParams),
            startTime: new Date(startTime),
          },
          {
            ...(options.resource && { resource: options.resource }),
            action: request.method.toLowerCase(),
            outcome: 'PENDING',
          }
        );
      }

      // Execute handler
      response = await handler(request, ...args);

      // Log successful completion
      const duration = Date.now() - startTime;
      await auditLogger.logEvent(
        options.eventType || AuditEventType.ACCESS_GRANTED,
        auditContext,
        {
          method: request.method,
          path: request.nextUrl.pathname,
          statusCode: response.status,
          duration,
          endTime: new Date(),
        },
        {
          ...(options.resource && { resource: options.resource }),
          action: request.method.toLowerCase(),
          outcome: 'SUCCESS',
        }
      );

      return response;

    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      auditContext = auditContext! || extractAuditContext(request, userId);

      // Log error
      const duration = Date.now() - startTime;
      await auditLogger.logEvent(
        AuditEventType.SECURITY_VIOLATION,
        auditContext,
        {
          method: request.method,
          path: request.nextUrl.pathname,
          error: error.message,
          stack: error.stack,
          duration,
          endTime: new Date(),
        },
        {
          ...(options.resource && { resource: options.resource }),
          action: request.method.toLowerCase(),
          outcome: 'FAILURE',
          riskLevel: AuditRiskLevel.HIGH,
        }
      );

      // Return error response
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Audit decorator for database operations
 */
export function auditDatabaseOperation<T extends unknown[], R>(
  operation: (...args: T) => Promise<R>,
  options: {
    eventType: AuditEventType.DATA_CREATE | AuditEventType.DATA_READ | AuditEventType.DATA_UPDATE | AuditEventType.DATA_DELETE;
    resource: string;
    resourceId?: string;
    userId?: string;
  }
) {
  return async (...args: T): Promise<R> => {
    const context: AuditContext = {};
    if (options.userId) {
      context.userId = options.userId;
    }

    const startTime = Date.now();

    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;

      await auditLogger.logDataAccess(
        options.eventType,
        context,
        options.resource,
        options.resourceId || 'unknown',
        {
          duration,
          timestamp: new Date(),
          success: true,
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      await auditLogger.logEvent(
        options.eventType,
        context,
        {
          error: error instanceof Error ? error.message : String(error),
          duration,
          timestamp: new Date(),
          success: false,
        },
        {
          resource: options.resource,
          ...(options.resourceId && { resourceId: options.resourceId }),
          outcome: 'FAILURE',
          riskLevel: AuditRiskLevel.MEDIUM,
        }
      );

      throw error;
    }
  };
}

/**
 * Audit authentication events
 */
export class AuthAudit {
  static async loginAttempt(
    request: NextRequest,
    email: string,
    success: boolean,
    reason?: string
  ): Promise<void> {
    const context = extractAuditContext(request);
    const eventType = success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE;

    await auditLogger.logAuthentication(eventType, context, {
      email,
      reason,
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  static async logout(request: NextRequest, userId: string): Promise<void> {
    const context = extractAuditContext(request, userId);

    await auditLogger.logAuthentication(AuditEventType.LOGOUT, context, {
      timestamp: new Date(),
      sessionDuration: 'unknown', // Could be calculated if session start time is tracked
    });
  }

  static async passwordChange(
    request: NextRequest,
    userId: string,
    success: boolean
  ): Promise<void> {
    const context = extractAuditContext(request, userId);

    await auditLogger.logSecurity(
      AuditEventType.PASSWORD_CHANGE,
      context,
      {
        success,
        timestamp: new Date(),
      },
      success ? AuditRiskLevel.MEDIUM : AuditRiskLevel.HIGH
    );
  }

  static async suspiciousActivity(
    request: NextRequest,
    userId: string   | undefined,
    activity: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    const context = extractAuditContext(request, userId);

    await auditLogger.logSecurity(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      context,
      {
        activity,
        ...details,
        timestamp: new Date(),
      },
      AuditRiskLevel.CRITICAL
    );
  }
}

/**
 * Audit business events
 */
export class BusinessAudit {
  static async sessionEvent(
    eventType: AuditEventType.SESSION_CREATED | AuditEventType.SESSION_UPDATED | AuditEventType.SESSION_COMPLETED,
    userId: string,
    sessionId: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    const context: AuditContext = { userId };

    await auditLogger.logBusiness(
      eventType,
      context,
      'coaching_session',
      sessionId,
      {
        ...details,
        timestamp: new Date(),
      }
    );
  }

  static async actionItemEvent(
    eventType: AuditEventType.ACTION_ITEM_CREATED | AuditEventType.ACTION_ITEM_COMPLETED,
    userId: string,
    actionItemId: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    const context: AuditContext = { userId };

    await auditLogger.logBusiness(
      eventType,
      context,
      'action_item',
      actionItemId,
      {
        ...details,
        timestamp: new Date(),
      }
    );
  }

  static async scorecardSubmitted(
    userId: string,
    scorecardId: string,
    agentId: string,
    score: number
  ): Promise<void> {
    const context: AuditContext = { userId };

    await auditLogger.logBusiness(
      AuditEventType.SCORECARD_SUBMITTED,
      context,
      'scorecard',
      scorecardId,
      {
        agentId,
        score,
        timestamp: new Date(),
      }
    );
  }

  static async dataExport(
    userId: string,
    exportType: string,
    recordCount: number,
    filters?: Record<string, unknown>
  ): Promise<void> {
    const context: AuditContext = { userId };

    await auditLogger.logEvent(
      AuditEventType.DATA_EXPORT,
      context,
      {
        exportType,
        recordCount,
        filters,
        timestamp: new Date(),
      },
      {
        resource: 'data_export',
        action: 'export',
        riskLevel: AuditRiskLevel.MEDIUM,
      }
    );
  }

  static async dataImport(
    userId: string,
    importType: string,
    recordCount: number,
    success: boolean,
    errors?: string[]
  ): Promise<void> {
    const context: AuditContext = { userId };

    await auditLogger.logEvent(
      AuditEventType.DATA_IMPORT,
      context,
      {
        importType,
        recordCount,
        success,
        errors,
        timestamp: new Date(),
      },
      {
        resource: 'data_import',
        action: 'import',
        outcome: success ? 'SUCCESS' : 'FAILURE',
        riskLevel: AuditRiskLevel.MEDIUM,
      }
    );
  }
}

/**
 * Rate limiting audit
 */
export class RateLimitAudit {
  static async rateLimitExceeded(
    request: NextRequest,
    userId: string   | undefined,
    limit: number,
    window: number
  ): Promise<void> {
    const context = extractAuditContext(request, userId);

    await auditLogger.logSecurity(
      AuditEventType.RATE_LIMIT_EXCEEDED,
      context,
      {
        limit,
        window,
        path: request.nextUrl.pathname,
        method: request.method,
        timestamp: new Date(),
      },
      AuditRiskLevel.MEDIUM
    );
  }
}

/**
 * System audit events
 */
export class SystemAudit {
  static async systemStart(): Promise<void> {
    const context: AuditContext = {};

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_START,
      context,
      {
        timestamp: new Date(),
        version: process.env['npm_package_version'] || 'unknown',
        nodeVersion: process.version,
        environment: process.env['NODE_ENV'] || 'unknown',
      },
      {
        resource: 'system',
        action: 'start',
      }
    );
  }

  static async systemShutdown(): Promise<void> {
    const context: AuditContext = {};

    await auditLogger.logEvent(
      AuditEventType.SYSTEM_SHUTDOWN,
      context,
      {
        timestamp: new Date(),
        uptime: process.uptime(),
      },
      {
        resource: 'system',
        action: 'shutdown',
      }
    );
  }

  static async configurationChange(
    userId: string,
    configKey: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<void> {
    const context: AuditContext = { userId };

    await auditLogger.logEvent(
      AuditEventType.CONFIGURATION_CHANGE,
      context,
      {
        configKey,
        oldValue: typeof oldValue === 'object' ? '[OBJECT]' : String(oldValue),
        newValue: typeof newValue === 'object' ? '[OBJECT]' : String(newValue),
        timestamp: new Date(),
      },
      {
        resource: 'configuration',
        action: 'change',
        riskLevel: AuditRiskLevel.MEDIUM,
      }
    );
  }
}

// Export all audit utilities
export {
  auditLogger,
  AuditEventType,
  AuditRiskLevel,
};