// Edge-compatible logger that doesn't use Node.js APIs
import { NextRequest } from 'next/server';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  { pattern: /password["\s]*[:=]["\s]*["']?[^"',}\s]+/gi, replacement: 'password: [REDACTED]' },
  { pattern: /token["\s]*[:=]["\s]*["']?[^"',}\s]+/gi, replacement: 'token: [REDACTED]' },
  { pattern: /api[_-]?key["\s]*[:=]["\s]*["']?[^"',}\s]+/gi, replacement: 'api_key: [REDACTED]' },
  { pattern: /secret["\s]*[:=]["\s]*["']?[^"',}\s]+/gi, replacement: 'secret: [REDACTED]' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CARD_NUMBER]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: 'Bearer [TOKEN]' },
];

// Custom error class for application errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Sanitize sensitive data from logs
function sanitizeData(data: unknown): unknown {
  if (typeof data === 'string') {
    let sanitized = data;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields entirely
      if (['password', 'token', 'secret', 'apiKey', 'authorization'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

// Edge-compatible logger class
class EdgeLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;
  private readonly logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata: metadata ? (sanitizeData(metadata) as Record<string, unknown>) : undefined,
    };

    // Store in memory (Edge Runtime doesn't have file system access)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In development, log to console
    if (process.env['NODE_ENV'] !== 'production') {
      const logMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
      if (metadata) {
        console.warn(logMessage, entry.metadata);
      } else {
        console.warn(logMessage);
      }
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, {
      ...metadata,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            ...(error instanceof AppError && {
              statusCode: error.statusCode,
              isOperational: error.isOperational,
              context: sanitizeData(error.context),
            }),
          }
        : undefined,
    });
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// Global logger instance
const logger = new EdgeLogger((process.env['LOG_LEVEL'] as LogLevel) || 'info');

// Request logging function
export function logRequest(request: NextRequest, response?: Response, duration?: number): void {
  const logData = {
    method: request.method,
    url: request.url,
    headers: sanitizeData(Object.fromEntries(request.headers.entries())),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent'),
    statusCode: response?.status,
    duration,
  };

  logger.info('HTTP Request', logData);
}

// Error logging with context
export function logError(error: Error | AppError, context?: Record<string, unknown>): void {
  logger.error('Application Error', error, context);
}

// Security event logging
export function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  logger.warn(`Security Event: ${event}`, {
    event,
    details: sanitizeData(details),
    timestamp: new Date().toISOString(),
  });
}

// Performance logging
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  const logData = {
    operation,
    duration,
    metadata: sanitizeData(metadata),
  };

  if (duration > 1000) {
    logger.warn('Slow Operation', logData);
  } else {
    logger.debug('Performance Metric', logData);
  }
}

// Audit logging for compliance
export function logAudit(action: string, userId: string, details: Record<string, unknown>): void {
  logger.info('Audit Log', {
    action,
    userId,
    details: sanitizeData(details),
    timestamp: new Date().toISOString(),
  });
}

// Global error handler
export function globalErrorHandler(
  error: Error | AppError,
  request?: NextRequest
): {
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
  };
} {
  // Log the error
  logError(
    error,
    request
      ? {
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        }
      : undefined
  );

  // Determine if error is operational
  const isOperational = error instanceof AppError ? error.isOperational : false;

  // Return sanitized error response
  return {
    error: {
      message: isOperational ? error.message : 'Internal server error',
      statusCode: error instanceof AppError ? error.statusCode : 500,
      timestamp: new Date().toISOString(),
    },
  };
}

// Create structured logger for specific contexts
export function createContextLogger(context: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, { context, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, { context, ...meta }),
    error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
      logger.error(message, error, { context, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, { context, ...meta }),
  };
}

// Export logger instance for direct use
export default logger;

// API to retrieve logs (useful for debugging in Edge Runtime)
export function getLogEntries(level?: LogLevel, limit?: number): LogEntry[] {
  let logs = logger.getLogs();

  if (level) {
    logs = logs.filter(log => log.level === level);
  }

  if (limit) {
    logs = logs.slice(-limit);
  }

  return logs;
}
