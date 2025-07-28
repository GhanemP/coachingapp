/**
 * Unified Database Monitoring System
 * 
 * Consolidates all database monitoring functionality into a single, comprehensive system:
 * - Query performance monitoring and metrics collection
 * - Database health monitoring and connection pooling
 * - Query optimization and caching strategies
 * - Performance thresholds and alerting
 * 
 * This replaces the redundant monitoring implementations:
 * - database-monitor.ts
 * - simple-database-monitor.ts  
 * - database-optimizer.ts
 */

import { performance } from 'perf_hooks';

import { PrismaClient } from '@prisma/client';

import { logger, LogContext } from '../logger';

// Database performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  FAST: 50,      // < 50ms - optimal
  NORMAL: 200,   // 50-200ms - acceptable
  SLOW: 1000,    // 200-1000ms - slow
  CRITICAL: 5000 // > 5000ms - critical
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
  timestamp: Date;
}

// Query statistics interface
export interface QueryStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: number;
  criticalQueries: number;
  errorCount: number;
  fastQueries: number;
  byModel: Record<string, {
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
  byOperation: Record<string, {
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
}

// Database health status
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details: {
    connection: boolean;
    queryPerformance: 'good' | 'slow' | 'critical';
    activeConnections?: number;
  };
}

// Unified query statistics collector
class UnifiedQueryStatsCollector {
  private stats: QueryStats = {
    totalQueries: 0,
    averageDuration: 0,
    slowQueries: 0,
    criticalQueries: 0,
    errorCount: 0,
    fastQueries: 0,
    byModel: {},
    byOperation: {},
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
    switch (metadata.performance) {
      case 'fast':
        this.stats.fastQueries++;
        break;
      case 'slow':
        this.stats.slowQueries++;
        break;
      case 'critical':
        this.stats.criticalQueries++;
        break;
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
      fastQueries: 0,
      byModel: {},
      byOperation: {},
    };
    this.queryHistory = [];
  }
}

// Global stats collector instance
const queryStatsCollector = new UnifiedQueryStatsCollector();

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

// Log query performance
function logQuery(metadata: QueryMetadata): void {
  const { operation, model, duration, performance, recordCount } = metadata;
  
  const message = `DB ${operation} on ${model} (${duration}ms)${recordCount ? ` - ${recordCount} records` : ''}`;
  
  // Log based on performance
  switch (performance) {
    case 'fast':
    case 'normal':
      logger.debug(message, { ...metadata, category: 'database' });
      break;
    case 'slow':
      logger.warn(`Slow query: ${message}`, { ...metadata, category: 'database' });
      break;
    case 'critical':
      logger.error(`Critical slow query: ${message}`, undefined, { ...metadata, category: 'database' });
      break;
  }
}

// Create standard Prisma instance
export const prisma = new PrismaClient();

// Wrapper function for monitored operations
export async function monitoredOperation<T>(
  operation: DatabaseOperation,
  model: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    const performanceCategory = categorizePerformance(duration);
    
    // Determine record count if possible
    let recordCount: number | undefined;
    if (Array.isArray(result)) {
      recordCount = result.length;
    } else if (result && typeof result === 'object' && 'count' in result) {
      recordCount = (result as { count: number }).count;
    }

    const metadata: QueryMetadata = {
      operation,
      model,
      duration,
      performance: performanceCategory,
      recordCount,
      context,
      timestamp: new Date(),
    };

    // Log the query
    logQuery(metadata);
    queryStatsCollector.addQuery(metadata);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    const performanceCategory = categorizePerformance(duration);
    
    const metadata: QueryMetadata = {
      operation,
      model,
      duration,
      performance: performanceCategory,
      error: error as Error,
      context,
      timestamp: new Date(),
    };

    logQuery(metadata);
    queryStatsCollector.addQuery(metadata);
    
    throw error;
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = performance.now();
  
  try {
    // Simple health check query
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = performance.now() - startTime;
    
    // Get query performance stats
    const stats = queryStatsCollector.getStats();
    let queryPerformance: 'good' | 'slow' | 'critical' = 'good';
    
    if (stats.averageDuration > PERFORMANCE_THRESHOLDS.CRITICAL) {
      queryPerformance = 'critical';
    } else if (stats.averageDuration > PERFORMANCE_THRESHOLDS.SLOW) {
      queryPerformance = 'slow';
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (responseTime > PERFORMANCE_THRESHOLDS.SLOW || queryPerformance === 'slow') {
      status = 'degraded';
    }
    if (responseTime > PERFORMANCE_THRESHOLDS.CRITICAL || queryPerformance === 'critical') {
      status = 'unhealthy';
    }
    
    return {
      status,
      responseTime: Math.round(responseTime * 100) / 100,
      details: {
        connection: true,
        queryPerformance
      }
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    logger.error('Database health check failed', error instanceof Error ? error : undefined, {
      duration: responseTime,
      metadata: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseTimeMs: `${responseTime}ms`
      }
    });
    
    return {
      status: 'unhealthy',
      responseTime: Math.round(responseTime * 100) / 100,
      details: {
        connection: false,
        queryPerformance: 'critical'
      }
    };
  }
}

// Utility functions for unified query monitoring
export const unifiedQueryMonitor = {
  getStats: () => queryStatsCollector.getStats(),
  getRecentQueries: (limit?: number) => queryStatsCollector.getRecentQueries(limit),
  getSlowQueries: (limit?: number) => queryStatsCollector.getSlowQueries(limit),
  reset: () => queryStatsCollector.reset(),
  
  // Generate comprehensive performance report
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
        criticalQueryPercentage: stats.totalQueries > 0
          ? Math.round((stats.criticalQueries / stats.totalQueries) * 100 * 100) / 100
          : 0,
        errorRate: stats.totalQueries > 0
          ? Math.round((stats.errorCount / stats.totalQueries) * 100 * 100) / 100
          : 0,
        fastQueryPercentage: stats.totalQueries > 0
          ? Math.round((stats.fastQueries / stats.totalQueries) * 100 * 100) / 100
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

  // Check database health
  checkHealth: checkDatabaseHealth,
};

// Export for backward compatibility
export const queryMonitor = unifiedQueryMonitor;

export default prisma;