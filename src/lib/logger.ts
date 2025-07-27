// Simple logger that works in both Node.js and Edge Runtime
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

interface Logger {
  error: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  http: (message: string, meta?: unknown) => void;
  debug: (message: string, meta?: unknown) => void;
  logError: (error: Error, context?: string) => void;
}

class SimpleLogger implements Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private logLevel = process.env.LOG_LEVEL || 'info';
  
  private levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  };

  private shouldLog(level: LogLevel): boolean {
    const currentLevelValue = this.levels[this.logLevel as LogLevel] || this.levels.info;
    return this.levels[level] <= currentLevelValue;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'hashedPassword',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'session',
      'creditCard',
      'ssn',
      'email',
      'phone',
      'csrf',
      'jwt',
      'bearer',
      'refresh',
      'access',
      'private',
      'key',
    ];

    const sanitized: Record<string, unknown> = Array.isArray(data)
      ? [...data] as unknown as Record<string, unknown>
      : { ...data as Record<string, unknown> };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return Array.isArray(data) ? Object.values(sanitized) : sanitized;
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) return;

    const timestamp = this.formatTimestamp();
    const sanitizedMeta = meta ? this.sanitizeData(meta) : undefined;

    if (typeof console === 'undefined') return;

    const logObject: Record<string, unknown> = {
      level,
      message,
      timestamp,
    };
    
    if (sanitizedMeta) {
      logObject.meta = sanitizedMeta;
    }
    
    const logMessage = this.isDevelopment
      ? `${timestamp} ${level.toUpperCase()}: ${message}`
      : JSON.stringify(logObject);

    switch (level) {
      case 'error':
        console.error(logMessage, sanitizedMeta || '');
        break;
      case 'warn':
        console.warn(logMessage, sanitizedMeta || '');
        break;
      default:
        console.log(logMessage, sanitizedMeta || '');
    }
  }

  error(message: string, meta?: unknown): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log('info', message, meta);
  }

  http(message: string, meta?: unknown): void {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: unknown): void {
    this.log('debug', message, meta);
  }

  logError(error: Error, context?: string): void {
    this.error(context || 'An error occurred', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }
}

// Create singleton instance
const logger = new SimpleLogger();

// Export default logger
export default logger;

// Export stream for Morgan middleware compatibility
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};