/**
 * Optimized Prisma Client Configuration
 *
 * This module provides an enhanced Prisma client with:
 * - Connection pooling optimization
 * - Query performance monitoring
 * - Automatic retry logic
 * - Connection health monitoring
 * - Performance metrics collection
 *
 * @version 1.0.0
 * @author SmartSource Coaching Hub
 */

import { PrismaClient, Prisma } from '@prisma/client';

import { queryMonitor, OptimizedQueries, healthMonitor } from './database-optimizer';
import logger from './logger';

// Connection pool configuration
// Connection pool configuration (currently unused but kept for future use)
// const CONNECTION_POOL_CONFIG = {
//   // Maximum number of database connections in the pool
//   connectionLimit: parseInt(process.env['DATABASE_CONNECTION_LIMIT'] || '10'),
//
//   // Connection timeout in milliseconds
//   connectTimeout: parseInt(process.env['DATABASE_CONNECT_TIMEOUT'] || '10000'),
//
//   // Pool timeout in milliseconds
//   poolTimeout: parseInt(process.env['DATABASE_POOL_TIMEOUT'] || '10000'),
//
//   // Maximum lifetime of a connection in milliseconds
//   maxLifetime: parseInt(process.env['DATABASE_MAX_LIFETIME'] || '3600000'), // 1 hour
//
//   // Idle timeout in milliseconds
//   idleTimeout: parseInt(process.env['DATABASE_IDLE_TIMEOUT'] || '600000'), // 10 minutes
// } as const;

// Query timeout configuration
const QUERY_TIMEOUTS = {
  default: 30000, // 30 seconds
  long: 60000, // 1 minute for complex queries
  batch: 120000, // 2 minutes for batch operations
  migration: 300000, // 5 minutes for migrations
} as const;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
} as const;

/**
 * Enhanced Prisma client with optimizations
 */
class OptimizedPrismaClient extends PrismaClient {
  private connectionHealthy = true;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 30000; // 30 seconds
  public readonly optimizedQueries: OptimizedQueries;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env['DATABASE_URL'],
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' },
      ],
      errorFormat: 'pretty',
    });

    this.optimizedQueries = new OptimizedQueries(this);
    this.setupEventHandlers();
    this.setupHealthMonitoring();
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    // Monitor query performance
    (
      this as {
        $on: (
          event: string,
          callback: (e: { query: string; params: string; duration: number }) => void
        ) => void;
      }
    ).$on('query', e => {
      queryMonitor.recordQuery({
        operation: 'query',
        model: this.extractModelFromQuery(e.query),
        duration: e.duration,
        timestamp: new Date(),
        args: {
          query: e.query,
          params: e.params,
        },
      });

      // Log slow queries
      if (e.duration > 1000) {
        logger.warn('Slow query detected', {
          duration: e.duration,
          operation: 'query',
          metadata: {
            query: e.query,
            params: e.params,
          },
        });
      }
    });

    // Handle database errors
    (
      this as {
        $on: (event: string, callback: (e: { message: string; target?: string }) => void) => void;
      }
    ).$on('error', e => {
      this.connectionHealthy = false;
      logger.error('Database error occurred', undefined, {
        metadata: {
          message: e.message,
          target: e.target,
        },
      });
    });

    // Handle warnings
    (
      this as {
        $on: (event: string, callback: (e: { message: string; target?: string }) => void) => void;
      }
    ).$on('warn', e => {
      logger.warn('Database warning', {
        metadata: {
          message: e.message,
          target: e.target,
        },
      });
    });

    // Handle info messages
    (
      this as {
        $on: (event: string, callback: (e: { message: string; target?: string }) => void) => void;
      }
    ).$on('info', e => {
      logger.info('Database info', {
        metadata: {
          message: e.message,
          target: e.target,
        },
      });
    });
  }

  /**
   * Setup periodic health monitoring
   */
  private setupHealthMonitoring(): void {
    // Check health periodically
    setInterval(async () => {
      await this.checkConnectionHealth();
    }, this.healthCheckInterval);
  }

  /**
   * Extract model name from query string
   */
  private extractModelFromQuery(query: string): string {
    const match =
      query.match(/FROM\s+"?(\w+)"?/i) ||
      query.match(/UPDATE\s+"?(\w+)"?/i) ||
      query.match(/INSERT\s+INTO\s+"?(\w+)"?/i);
    return match?.[1] || 'unknown';
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(): Promise<boolean> {
    const now = Date.now();

    // Skip if recently checked
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.connectionHealthy;
    }

    try {
      await this.$queryRaw`SELECT 1`;
      this.connectionHealthy = true;
      this.lastHealthCheck = now;
      return true;
    } catch (error) {
      this.connectionHealthy = false;
      this.lastHealthCheck = now;

      logger.error(
        'Database connection health check failed',
        error instanceof Error ? error : undefined,
        {
          metadata: {
            lastHealthy: new Date(this.lastHealthCheck).toISOString(),
          },
        }
      );

      return false;
    }
  }

  /**
   * Execute query with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = RETRY_CONFIG.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Sequential retry execution is intentional for retry logic
        // eslint-disable-next-line no-await-in-loop
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
            RETRY_CONFIG.maxDelay
          );

          logger.warn(`Database operation failed, retrying in ${delay}ms`, {
            operation: operationName,
            metadata: {
              attempt: attempt + 1,
              maxRetries,
              error: lastError.message,
            },
          });

          // Sequential delay is intentional for retry backoff strategy
          // eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`Database operation failed after ${maxRetries} retries`, lastError, {
      operation: operationName,
    });

    throw lastError;
  }

  /**
   * Determine if error should not be retried
   */
  private shouldNotRetry(error: Error): boolean {
    const nonRetryableErrors = [
      'P2002', // Unique constraint violation
      'P2003', // Foreign key constraint violation
      'P2004', // Constraint violation
      'P2025', // Record not found
      'P2016', // Query interpretation error
      'P2017', // Records not connected
    ];

    return nonRetryableErrors.some(code => error.message.includes(code));
  }

  /**
   * Execute transaction with timeout and retry
   */
  executeTransaction<T>(
    operations: (tx: Prisma.TransactionClient) => Promise<T>,
    options: {
      timeout?: number;
      maxRetries?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    } = {}
  ): Promise<T> {
    const {
      timeout = QUERY_TIMEOUTS.default,
      maxRetries = RETRY_CONFIG.maxRetries,
      isolationLevel,
    } = options;

    return this.executeWithRetry(
      () =>
        this.$transaction(operations, {
          timeout,
          ...(isolationLevel && { isolationLevel }),
        }),
      'transaction',
      maxRetries
    );
  }

  /**
   * Get connection status and metrics
   */
  getConnectionStatus(): {
    healthy: boolean;
    lastHealthCheck: Date;
    queryStats: ReturnType<typeof queryMonitor.getStats>;
  } {
    return {
      healthy: this.connectionHealthy,
      lastHealthCheck: new Date(this.lastHealthCheck),
      queryStats: queryMonitor.getStats(),
    };
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    try {
      logger.info('Shutting down database connections gracefully');
      await this.$disconnect();
      logger.info('Database connections closed successfully');
    } catch (error) {
      logger.error('Error during database shutdown', error instanceof Error ? error : undefined);
    }
  }
}

// Create singleton instance
const prismaOptimized = new OptimizedPrismaClient();

// Handle process termination
process.on('SIGINT', async () => {
  await prismaOptimized.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaOptimized.gracefulShutdown();
  process.exit(0);
});

// Export the optimized client and utilities
export { prismaOptimized as prisma };
export { OptimizedQueries, queryMonitor, healthMonitor };
export default prismaOptimized;

// Export interfaces
export interface QueryMetrics {
  operation: string;
  model: string;
  duration: number;
  timestamp: Date;
  args?: unknown;
  result?: {
    count?: number;
    affectedRows?: number;
  };
}

/**
 * Utility function to create a database health check endpoint
 */
export async function getDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    connection: boolean;
    responseTime: number;
    queryPerformance: {
      averageDuration: number;
      slowQueries: number;
      totalQueries: number;
    };
    lastHealthCheck: Date;
  };
}> {
  const connectionStatus = prismaOptimized.getConnectionStatus();
  const healthCheck = await healthMonitor.checkHealth();

  return {
    status: healthCheck.status,
    details: {
      connection: connectionStatus.healthy,
      responseTime: healthCheck.responseTime,
      queryPerformance: {
        averageDuration: connectionStatus.queryStats.averageDuration,
        slowQueries: connectionStatus.queryStats.slowQueries,
        totalQueries: connectionStatus.queryStats.totalQueries,
      },
      lastHealthCheck: connectionStatus.lastHealthCheck,
    },
  };
}

/**
 * Utility function to get query performance metrics
 */
export function getQueryMetrics() {
  return queryMonitor.getStats();
}
