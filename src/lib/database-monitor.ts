import { PrismaClient } from '@prisma/client';

import { logger, LogContext } from './logger';

// Try to import Sentry, fallback to no-op implementation if not available
let Sentry: {
  addBreadcrumb: (breadcrumb: { message?: string; category?: string; level?: string; data?: unknown }) => void;
  captureMessage: (message: string, level?: string) => void;
};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs');
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Sentry: FallbackSentry } = require('./sentry-fallback');
  Sentry = FallbackSentry;
}

// Database performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  FAST: 50,      // < 50ms - optimal
  NORMAL: 200,   // 50-200ms - acceptable
  SLOW: 1000,    // 200-1000ms - slow
  CRITICAL: 5000 // > 1000ms - critical
} as const;

// Query performance categories
export type QueryPerformance = 'fast' | 'normal' | 'slow' | 'critical';

// Database operation types
export type DatabaseOperation = 
  | 'findMany' | 'findUnique' | 'findFirst'
  | 'create' | 'createMany'
  | 'update' | 'updateMany'
  | 'delete' | 'deleteMany'
  | 'upsert' | 'count' | 'aggregate'
  | 'raw' | 'transaction';

// Query metadata interface
export interface QueryMetadata {
  operation: DatabaseOperation;
  model: string;
  duration: number;
  performance: QueryPerformance;
  recordCount?: number;
  conditions?: Record<string, unknown>;
  error?: Error;
  context?: LogContext;
}

// Query statistics interface
export interface QueryStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: number;
  criticalQueries: number;
  errorCount: number;
  byModel: Record<string, {
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
  byOperation: Record<DatabaseOperation, {
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
}

// In-memory query statistics (consider using Redis for production)
class QueryStatsCollector {
  private stats: QueryStats = {
    totalQueries: 0,
    averageDuration: 0,
    slowQueries: 0,
    criticalQueries: 0,
    errorCount: 0,
    byModel: {},
    byOperation: {} as Record<DatabaseOperation, {
      count: number;
      averageDuration: number;
      slowCount: number;
    }>,
  };

  private queryHistory: QueryMetadata[] = [];
  private readonly maxHistorySize = 1000;

  addQuery(metadata: QueryMetadata): void {
    // Update overall stats
    this.stats.totalQueries++;
    this.stats.averageDuration = this.calculateNewAverage(
      this.stats.averageDuration,
      metadata.duration,
      this.stats.totalQueries
    );

    // Update performance counters
    if (metadata.performance === 'slow') {
      this.stats.slowQueries++;
    } else if (metadata.performance === 'critical') {
      this.stats.criticalQueries++;
    }

    if (metadata.error) {
      this.stats.errorCount++;
    }

    // Update model stats
    if (!this.stats.byModel[metadata.model]) {
      this.stats.byModel[metadata.model] = {
        count: 0,
        averageDuration: 0,
        slowCount: 0,
      };
    }

    const modelStats = this.stats.byModel[metadata.model];
    modelStats.count++;
    modelStats.averageDuration = this.calculateNewAverage(
      modelStats.averageDuration,
      metadata.duration,
      modelStats.count
    );

    if (metadata.performance === 'slow' || metadata.performance === 'critical') {
      modelStats.slowCount++;
    }

    // Update operation stats
    if (!this.stats.byOperation[metadata.operation]) {
      this.stats.byOperation[metadata.operation] = {
        count: 0,
        averageDuration: 0,
        slowCount: 0,
      };
    }

    const operationStats = this.stats.byOperation[metadata.operation];
    operationStats.count++;
    operationStats.averageDuration = this.calculateNewAverage(
      operationStats.averageDuration,
      metadata.duration,
      operationStats.count
    );

    if (metadata.performance === 'slow' || metadata.performance === 'critical') {
      operationStats.slowCount++;
    }

    // Add to history
    this.queryHistory.push(metadata);
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift();
    }
  }

  private calculateNewAverage(currentAvg: number, newValue: number, count: number): number {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  getStats(): QueryStats {
    return { ...this.stats };
  }

  getRecentQueries(limit: number = 50): QueryMetadata[] {
    return this.queryHistory.slice(-limit);
  }

  getSlowQueries(limit: number = 20): QueryMetadata[] {
    return this.queryHistory
      .filter(q => q.performance === 'slow' || q.performance === 'critical')
      .slice(-limit);
  }

  reset(): void {
    this.stats = {
      totalQueries: 0,
      averageDuration: 0,
      slowQueries: 0,
      criticalQueries: 0,
      errorCount: 0,
      byModel: {},
      byOperation: {} as Record<DatabaseOperation, {
        count: number;
        averageDuration: number;
        slowCount: number;
      }>,
    };
    this.queryHistory = [];
  }
}

// Global stats collector instance
const queryStatsCollector = new QueryStatsCollector();

// Determine query performance category
function categorizePerformance(duration: number): QueryPerformance {
  if (duration < PERFORMANCE_THRESHOLDS.FAST) {
    return 'fast';
  }
  if (duration < PERFORMANCE_THRESHOLDS.NORMAL) {
    return 'normal';
  }
  if (duration < PERFORMANCE_THRESHOLDS.SLOW) {
    return 'slow';
  }
  return 'critical';
}

// Enhanced Prisma client with monitoring
export class MonitoredPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Set up query event listeners
    this.$on('query' as never, (event: { duration: number; query: string; params?: string }) => {
      const duration = event.duration;
      const performance = categorizePerformance(duration);
      
      const metadata: QueryMetadata = {
        operation: this.extractOperation(event.query),
        model: this.extractModel(event.query),
        duration,
        performance,
        conditions: event.params ? JSON.parse(event.params) : undefined,
      };

      // Log the query
      this.logQuery(metadata);
      
      // Add to stats
      queryStatsCollector.addQuery(metadata);
    });

    this.$on('error' as never, (event: { message: string; target?: string }) => {
      logger.error('Database error', new Error(event.message), {
        target: event.target,
      });
    });

    this.$on('info' as never, (event: { message: string; target?: string }) => {
      logger.info(`Database info: ${event.message}`, {
        target: event.target,
      });
    });

    this.$on('warn' as never, (event: { message: string; target?: string }) => {
      logger.warn(`Database warning: ${event.message}`, {
        target: event.target,
      });
    });
  }

  private extractOperation(query: string): DatabaseOperation {
    const upperQuery = query.toUpperCase().trim();
    
    if (upperQuery.startsWith('SELECT')) {
      if (upperQuery.includes('LIMIT 1')) {return 'findUnique';}
      if (upperQuery.includes('COUNT(')) {return 'count';}
      return 'findMany';
    }
    if (upperQuery.startsWith('INSERT')) {return 'create';}
    if (upperQuery.startsWith('UPDATE')) {return 'update';}
    if (upperQuery.startsWith('DELETE')) {return 'delete';}
    if (upperQuery.includes('UPSERT') || upperQuery.includes('ON CONFLICT')) {return 'upsert';}
    
    return 'raw';
  }

  private extractModel(query: string): string {
    // Extract table name from SQL query
    const tableMatch = query.match(/(?:FROM|INTO|UPDATE|JOIN)\s+["`]?(\w+)["`]?/i);
    if (tableMatch) {
      return tableMatch[1];
    }
    
    return 'unknown';
  }

  private logQuery(metadata: QueryMetadata): void {
    const { operation, model, duration, performance, recordCount } = metadata;
    
    const message = `DB ${operation} on ${model} (${duration}ms)${recordCount ? ` - ${recordCount} records` : ''}`;
    
    // Log based on performance
    switch (performance) {
      case 'fast':
        logger.debug(message, { ...metadata, category: 'database' });
        break;
      case 'normal':
        logger.debug(message, { ...metadata, category: 'database' });
        break;
      case 'slow':
        logger.warn(`Slow query: ${message}`, { ...metadata, category: 'database' });
        
        // Send slow query to Sentry
        Sentry.addBreadcrumb({
          message: `Slow database query: ${operation} on ${model}`,
          category: 'database',
          level: 'warning',
          data: metadata,
        });
        break;
      case 'critical':
        logger.error(`Critical slow query: ${message}`, undefined, { ...metadata, category: 'database' });
        
        // Send critical query to Sentry
        Sentry.captureMessage(`Critical slow database query: ${operation} on ${model}`, 'warning');
        break;
    }
  }

  // Wrapper method for monitored operations
  async monitoredOperation<T>(
    operation: DatabaseOperation,
    model: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const performance = categorizePerformance(duration);
      
      // Determine record count if possible
      let recordCount: number   | undefined;
      if (Array.isArray(result)) {
        recordCount = result.length;
      } else if (result && typeof result === 'object' && 'count' in result) {
        recordCount = (result as { count: number }).count;
      }

      const metadata: QueryMetadata = {
        operation,
        model,
        duration,
        performance,
        recordCount,
        context,
      };

      this.logQuery(metadata);
      queryStatsCollector.addQuery(metadata);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const performance = categorizePerformance(duration);
      
      const metadata: QueryMetadata = {
        operation,
        model,
        duration,
        performance,
        error: error as Error,
        context,
      };

      this.logQuery(metadata);
      queryStatsCollector.addQuery(metadata);
      
      throw error;
    }
  }
}

// Create monitored Prisma instance
export const prisma = new MonitoredPrismaClient();

// Utility functions for query monitoring
export const queryMonitor = {
  getStats: () => queryStatsCollector.getStats(),
  getRecentQueries: (limit?: number) => queryStatsCollector.getRecentQueries(limit),
  getSlowQueries: (limit?: number) => queryStatsCollector.getSlowQueries(limit),
  reset: () => queryStatsCollector.reset(),
  
  // Generate performance report
  generateReport: () => {
    const stats = queryStatsCollector.getStats();
    const slowQueries = queryStatsCollector.getSlowQueries(10);
    
    return {
      summary: {
        totalQueries: stats.totalQueries,
        averageDuration: Math.round(stats.averageDuration * 100) / 100,
        slowQueryPercentage: stats.totalQueries > 0 
          ? Math.round((stats.slowQueries / stats.totalQueries) * 100 * 100) / 100
          : 0,
        errorRate: stats.totalQueries > 0
          ? Math.round((stats.errorCount / stats.totalQueries) * 100 * 100) / 100
          : 0,
      },
      topSlowModels: Object.entries(stats.byModel)
        .sort(([,a], [,b]) => b.averageDuration - a.averageDuration)
        .slice(0, 5)
        .map(([model, data]) => ({ model, ...data })),
      topSlowOperations: Object.entries(stats.byOperation)
        .sort(([,a], [,b]) => b.averageDuration - a.averageDuration)
        .slice(0, 5)
        .map(([operation, data]) => ({ operation, ...data })),
      recentSlowQueries: slowQueries.slice(-5),
    };
  },
};

export default prisma;