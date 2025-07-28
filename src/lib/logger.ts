import winston from 'winston';

// Try to import Sentry, fallback to no-op implementation if not available
let Sentry: {
  withScope: (callback: (scope: { setUser: (user: { id: string }) => void; setTag: (key: string, value: string | boolean) => void; setExtra: (key: string, value: unknown) => void; setLevel: (level: string) => void; level?: string }) => void) => void;
  captureException: (error: Error) => void;
  captureMessage: (message: string, level?: string) => void;
  addBreadcrumb: (breadcrumb: { message?: string; category?: string; level?: string; data?: unknown }) => void;
};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs');
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Sentry: FallbackSentry } = require('./sentry-fallback');
  Sentry = FallbackSentry;
}

// Define log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

// Define log context interface
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
  // Additional fields for monitoring
  operation?: string;
  table?: string;
  model?: string;
  action?: string;
  performance?: string;
  category?: string;
  target?: string;
  transactionId?: string;
  batchSize?: number;
  isBatch?: boolean;
  totalQueries?: number;
  slowQueries?: number;
  errorCount?: number;
  event?: string;
  severity?: string;
  limit?: number;
  remaining?: number;
  resetTime?: string;
  status?: string;
  databaseResponseTime?: number;
  memoryUsage?: number;
  checks?: unknown;
  // Missing properties used throughout the codebase
  hasSessionToken?: boolean;
  changes?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  email?: string;
  key?: string;
  messageId?: string;
  path?: string;
  strict?: boolean;
  type?: string;
  lockedUntil?: Date;
  message?: string;
  errors?: unknown;
  // Allow additional dynamic properties
  [key: string]: unknown;
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'coaching-app',
    environment: process.env['NODE_ENV'] || 'development',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
    
    // File transport for production
    ...(process.env['NODE_ENV'] === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
});

// Enhanced logger class
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, additionalContext?: LogContext): void {
    const context = { ...this.context, ...additionalContext };
    
    // Log to Winston
    winstonLogger.error(message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });

    // Send to Sentry
    if (error) {
      Sentry.withScope((scope) => {
        // Add context to Sentry scope
        if (context.userId) {scope.setUser({ id: context.userId });}
        if (context.sessionId) {scope.setTag('sessionId', context.sessionId);}
        if (context.requestId) {scope.setTag('requestId', context.requestId);}
        if (context.url) {scope.setTag('url', context.url);}
        if (context.method) {scope.setTag('method', context.method);}
        if (context.statusCode) {scope.setTag('statusCode', context.statusCode.toString());}
        
        // Add additional metadata
        if (context.metadata) {
          Object.entries(context.metadata).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }

        scope.setLevel('error');
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, additionalContext?: LogContext): void {
    const context = { ...this.context, ...additionalContext };
    
    winstonLogger.warn(message, context);
    
    // Send warnings to Sentry in production
    if (process.env['NODE_ENV'] === 'production') {
      Sentry.captureMessage(message, 'warning');
    }
  }

  /**
   * Log info messages
   */
  info(message: string, additionalContext?: LogContext): void {
    const context = { ...this.context, ...additionalContext };
    winstonLogger.info(message, context);
  }

  /**
   * Log HTTP requests
   */
  http(message: string, additionalContext?: LogContext): void {
    const context = { ...this.context, ...additionalContext };
    winstonLogger.http(message, context);
  }

  /**
   * Log debug messages
   */
  debug(message: string, additionalContext?: LogContext): void {
    const context = { ...this.context, ...additionalContext };
    winstonLogger.debug(message, context);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, additionalContext?: LogContext): void {
    const context = {
      ...this.context,
      ...additionalContext,
      duration,
      operation,
    };

    winstonLogger.info(`Performance: ${operation} completed in ${duration}ms`, context);

    // Send performance data to Sentry
    Sentry.addBreadcrumb({
      message: `Performance: ${operation}`,
      category: 'performance',
      level: 'info',
      data: context,
    });
  }

  /**
   * Log database operations
   */
  database(operation: string, table: string, duration?: number, additionalContext?: LogContext): void {
    const context = {
      ...this.context,
      ...additionalContext,
      operation,
      table,
      duration,
    };

    winstonLogger.debug(`Database: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`, context);
  }

  /**
   * Log authentication events
   */
  auth(event: string, userId?: string, additionalContext?: LogContext): void {
    const context = {
      ...this.context,
      ...additionalContext,
      userId,
      event,
    };

    winstonLogger.info(`Auth: ${event}${userId ? ` for user ${userId}` : ''}`, context);

    // Add auth breadcrumb to Sentry
    Sentry.addBreadcrumb({
      message: `Auth: ${event}`,
      category: 'auth',
      level: 'info',
      data: context,
    });
  }

  /**
   * Log security events
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', additionalContext?: LogContext): void {
    const context = {
      ...this.context,
      ...additionalContext,
      event,
      severity,
    };

    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    winstonLogger[logLevel](`Security: ${event} (${severity})`, context);

    // Send security events to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('security', true);
      scope.setTag('severity', severity);
      scope.setLevel(severity === 'critical' || severity === 'high' ? 'error' : 'warning');
      
      Sentry.captureMessage(`Security: ${event}`, scope.level);
    });
  }
}

// Create default logger instance
export const logger = new Logger();

// Export utility functions
export const createLogger = (context: LogContext): Logger => new Logger(context);

// Request logger middleware helper
export const createRequestLogger = (req: {
  headers?: { get?: (key: string) => string | null; [key: string]: unknown };
  method?: string;
  url?: string;
  connection?: { remoteAddress?: string };
}): Logger => {
  // Extract request ID with proper fallback logic
  const getRequestId = (): string => {
    const headerValue = req.headers?.get?.('x-request-id');
    if (headerValue) {
      return headerValue;
    }
    if (typeof req.headers?.['x-request-id'] === 'string') {
      return req.headers['x-request-id'];
    }
    return Math.random().toString(36).substring(7);
  };

  // Extract user agent with proper fallback logic
  const getUserAgent = (): string | undefined => {
    const headerValue = req.headers?.get?.('user-agent');
    if (headerValue) {
      return headerValue;
    }
    if (typeof req.headers?.['user-agent'] === 'string') {
      return req.headers['user-agent'];
    }
    return undefined;
  };

  // Extract IP address with proper fallback logic
  const getIpAddress = (): string | undefined => {
    const headerValue = req.headers?.get?.('x-forwarded-for');
    if (headerValue) {
      return headerValue;
    }
    if (typeof req.headers?.['x-forwarded-for'] === 'string') {
      return req.headers['x-forwarded-for'];
    }
    return req.connection?.remoteAddress;
  };

  return new Logger({
    requestId: getRequestId(),
    method: req.method,
    url: req.url,
    userAgent: getUserAgent(),
    ip: getIpAddress(),
  });
};

// Performance measurement utility
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  logger?: Logger
): Promise<T> => {
  const start = Date.now();
  const log = logger || new Logger();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    log.performance(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    log.error(`Performance: ${operation} failed after ${duration}ms`, error as Error);
    throw error;
  }
};

// Database operation logger
export const logDatabaseOperation = async <T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
  logger?: Logger
): Promise<T> => {
  const start = Date.now();
  const log = logger || new Logger();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    log.database(operation, table, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    log.error(`Database: ${operation} on ${table} failed after ${duration}ms`, error as Error);
    throw error;
  }
};

export default logger;