/**
 * Database Query Optimization Utilities
 *
 * This module provides comprehensive database optimization features including:
 * - Query performance monitoring
 * - Connection pool optimization
 * - Query result caching strategies
 * - Database health monitoring
 * - Performance metrics collection
 *
 * @version 1.0.0
 * @author SmartSource Coaching Hub
 */

import { performance } from 'perf_hooks';

import { PrismaClient } from '@prisma/client';

import logger from './logger';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST: 50, // < 50ms - Fast query
  MEDIUM: 200, // 50-200ms - Medium query
  SLOW: 1000, // 200-1000ms - Slow query
  CRITICAL: 2000, // > 2000ms - Critical slow query
} as const;

// Query performance metrics
interface QueryMetrics {
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

// Performance monitoring state
class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 queries

  /**
   * Record query performance metrics
   */
  recordQuery(metrics: QueryMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (metrics.duration > PERFORMANCE_THRESHOLDS.SLOW) {
      logger.warn('Slow database query detected', {
        operation: metrics.operation,
        model: metrics.model,
        duration: metrics.duration,
        metadata: {
          args: metrics.args,
          durationMs: `${metrics.duration}ms`,
        },
      });
    }

    // Alert on critical queries
    if (metrics.duration > PERFORMANCE_THRESHOLDS.CRITICAL) {
      logger.error('Critical slow database query', undefined, {
        operation: metrics.operation,
        model: metrics.model,
        duration: metrics.duration,
        metadata: {
          args: metrics.args,
          durationMs: `${metrics.duration}ms`,
        },
      });
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    criticalQueries: number;
    fastQueries: number;
    recentQueries: QueryMetrics[];
  } {
    const totalQueries = this.metrics.length;
    const averageDuration =
      totalQueries > 0 ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries : 0;

    const slowQueries = this.metrics.filter(m => m.duration > PERFORMANCE_THRESHOLDS.SLOW).length;
    const criticalQueries = this.metrics.filter(
      m => m.duration > PERFORMANCE_THRESHOLDS.CRITICAL
    ).length;
    const fastQueries = this.metrics.filter(m => m.duration < PERFORMANCE_THRESHOLDS.FAST).length;

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      criticalQueries,
      fastQueries,
      recentQueries: this.metrics.slice(-10), // Last 10 queries
    };
  }

  /**
   * Clear metrics (for testing or reset)
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const queryMonitor = new QueryPerformanceMonitor();

/**
 * Enhanced Prisma client with performance monitoring
 */
export function createOptimizedPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  // Monitor query performance
  prisma.$on('query', e => {
    queryMonitor.recordQuery({
      operation: 'query',
      model: 'unknown',
      duration: e.duration,
      timestamp: new Date(),
      args: {
        query: e.query,
        params: e.params,
      },
    });
  });

  // Log database errors
  prisma.$on('error', e => {
    logger.error('Database error', undefined, {
      target: (e as { target?: string }).target,
      metadata: {
        message: e.message,
      },
    });
  });

  // Log database warnings
  prisma.$on('warn', e => {
    logger.warn('Database warning', {
      target: (e as { target?: string }).target,
      metadata: {
        message: e.message,
      },
    });
  });

  return prisma;
}

/**
 * Query performance wrapper for measuring execution time
 */
export async function measureQuery<T>(
  operation: string,
  model: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    // Record metrics
    queryMonitor.recordQuery({
      operation,
      model,
      duration,
      timestamp: new Date(),
      result: {
        count: Array.isArray(result) ? result.length : 1,
      },
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Record failed query
    queryMonitor.recordQuery({
      operation,
      model,
      duration,
      timestamp: new Date(),
    });

    logger.error('Database query failed', error instanceof Error ? error : undefined, {
      operation,
      model,
      duration,
      metadata: {
        durationMs: `${duration}ms`,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Optimized query builders for common patterns
 */
export class OptimizedQueries {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get agents with optimized includes and filtering
   */
  getAgentsOptimized(options: {
    userId: string;
    userRole: string;
    supervised?: boolean;
    includeMetrics?: boolean;
    limit?: number;
  }) {
    const { userId, userRole, supervised, includeMetrics = true, limit } = options;

    return measureQuery('findMany', 'User', () => {
      // Build optimized where clause
      const baseWhere = {
        role: 'AGENT',
        isActive: true,
      };

      let whereClause = baseWhere;

      // Optimize role-based filtering
      if (supervised && userRole === 'TEAM_LEADER') {
        // Use direct relationship instead of separate query
        whereClause = {
          ...baseWhere,
          teamLeaderId: userId,
        } as { role: string; isActive: boolean; teamLeaderId: string };
      }

      // Optimized select with conditional includes
      const selectClause = {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        agentProfile: {
          select: {
            employeeId: true,
          },
        },
        ...(includeMetrics && {
          agentMetrics: {
            select: {
              percentage: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc' as const,
            },
            take: 6, // Last 6 months
          },
        }),
      };

      return this.prisma.user.findMany({
        where: whereClause,
        select: selectClause,
        orderBy: {
          name: 'asc',
        },
        ...(limit && { take: limit }),
      });
    });
  }

  /**
   * Get action items with optimized filtering and includes
   */
  getActionItemsOptimized(options: {
    userId: string;
    userRole: string;
    filters: {
      status?: string;
      priority?: string;
      agentId?: string;
      assignedTo?: string;
      sessionId?: string;
    };
    pagination: {
      page: number;
      limit: number;
    };
  }) {
    const { userId, userRole, filters, pagination } = options;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    return measureQuery('findMany', 'ActionItem', async () => {
      // Build optimized where clause
      const where: Record<string, unknown> = {};

      // Optimize role-based filtering with single query
      if (userRole === 'AGENT') {
        where.OR = [{ agentId: userId }, { assignedTo: userId }];
      } else if (userRole === 'TEAM_LEADER') {
        // Use direct relationship instead of separate query
        where.OR = [
          { agent: { teamLeaderId: userId } },
          { createdBy: userId },
          { assignedTo: userId },
        ];
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'agentId' && userRole === 'TEAM_LEADER') {
            // Combine with role-based filtering
            where.AND = [{ OR: where.OR }, { agentId: value }];
            delete where.OR;
          } else {
            where[key] = value;
          }
        }
      });

      // Execute count and data queries in parallel
      const [total, actionItems] = await Promise.all([
        this.prisma.actionItem.count({ where }),
        this.prisma.actionItem.findMany({
          where,
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            session: {
              select: {
                id: true,
                sessionDate: true,
                status: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { priority: 'desc' }],
          skip,
          take: limit,
        }),
      ]);

      return {
        actionItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  /**
   * Get quick notes with optimized filtering
   */
  getQuickNotesOptimized(options: {
    userId: string;
    userRole: string;
    filters: {
      category?: string;
      agentId?: string;
      search?: string;
    };
    pagination: {
      page: number;
      limit: number;
    };
  }) {
    const { userId, userRole, filters, pagination } = options;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    return measureQuery('findMany', 'QuickNote', async () => {
      // Build optimized where clause
      const where: Record<string, unknown> = {};

      // Optimize role-based filtering
      if (userRole === 'AGENT') {
        where.OR = [
          { authorId: userId },
          {
            agentId: userId,
            OR: [{ authorId: userId }, { isPrivate: false }],
          },
        ];
      } else if (userRole === 'TEAM_LEADER') {
        // Use direct relationship instead of separate query
        where.OR = [
          { authorId: userId },
          {
            agent: { teamLeaderId: userId },
            OR: [{ isPrivate: false }, { authorId: userId }],
          },
        ];
      }

      // Apply filters
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.search) {
        where.content = { contains: filters.search };
      }

      if (filters.agentId && userRole === 'TEAM_LEADER') {
        // Combine with role-based filtering
        where.AND = [{ OR: where.OR }, { agentId: filters.agentId }];
        delete where.OR;
      } else if (filters.agentId) {
        where.agentId = filters.agentId;
      }

      // Execute count and data queries in parallel
      const [total, quickNotes] = await Promise.all([
        this.prisma.quickNote.count({ where }),
        this.prisma.quickNote.findMany({
          where,
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        quickNotes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }
}

/**
 * Database health monitoring
 */
export class DatabaseHealthMonitor {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check database connection health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    details: {
      connection: boolean;
      queryPerformance: 'good' | 'slow' | 'critical';
      activeConnections?: number;
    };
  }> {
    const startTime = performance.now();

    try {
      // Simple health check query
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = performance.now() - startTime;

      // Get query performance stats
      const stats = queryMonitor.getStats();
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
          queryPerformance,
        },
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;

      logger.error('Database health check failed', error instanceof Error ? error : undefined, {
        duration: responseTime,
        metadata: {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          responseTimeMs: `${responseTime}ms`,
        },
      });

      return {
        status: 'unhealthy',
        responseTime: Math.round(responseTime * 100) / 100,
        details: {
          connection: false,
          queryPerformance: 'critical',
        },
      };
    }
  }

  /**
   * Get database performance metrics
   */
  getPerformanceMetrics() {
    return queryMonitor.getStats();
  }
}

// Export singleton instances
export const optimizedQueries = new OptimizedQueries(new PrismaClient());
export const healthMonitor = new DatabaseHealthMonitor(new PrismaClient());
