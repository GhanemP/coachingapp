import winston from 'winston';

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
    ...(process.env['NODE_ENV'] === 'production'
      ? [
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
        ]
      : []),
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

    winstonLogger.error(message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Log warning messages
   */
  warn(message: string, additionalContext?: LogContext): void {
    const context = { ...this.context, ...additionalContext };
    winstonLogger.warn(message, context);
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
  }

  /**
   * Log database operations
   */
  database(
    operation: string,
    table: string,
    duration?: number,
    additionalContext?: LogContext
  ): void {
    const context = {
      ...this.context,
      ...additionalContext,
      operation,
      table,
      duration,
    };

    winstonLogger.debug(
      `Database: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`,
      context
    );
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
  }

  /**
   * Log security events
   */
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    additionalContext?: LogContext
  ): void {
    const context = {
      ...this.context,
      ...additionalContext,
      event,
      severity,
    };

    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    winstonLogger[logLevel](`Security: ${event} (${severity})`, context);
  }
}

// Create default logger instance
export const logger = new Logger();

// Export utility functions
export const createLogger = (context: LogContext): Logger => new Logger(context);

// Request logger middleware helper
export const createRequestLogger = (req: unknown): Logger => {
  const request = req as {
    headers?: { get?: (key: string) => string | null; [key: string]: unknown };
    method?: string;
    url?: string;
    connection?: { remoteAddress?: string };
  };
  return new Logger({
    requestId:
      request.headers?.get?.('x-request-id') ||
      (typeof request.headers?.['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined) ||
      Math.random().toString(36).substring(7),
    method: request.method,
    url: request.url,
    userAgent:
      request.headers?.get?.('user-agent') ||
      (typeof request.headers?.['user-agent'] === 'string'
        ? request.headers['user-agent']
        : undefined),
    ip:
      request.headers?.get?.('x-forwarded-for') ||
      (typeof request.headers?.['x-forwarded-for'] === 'string'
        ? request.headers['x-forwarded-for']
        : undefined) ||
      request.connection?.remoteAddress,
  });
};

// Performance measurement utility
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  loggerInstance?: Logger
): Promise<T> => {
  const start = Date.now();
  const log = loggerInstance || new Logger();

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
  loggerInstance?: Logger
): Promise<T> => {
  const start = Date.now();
  const log = loggerInstance || new Logger();

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
