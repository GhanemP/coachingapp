import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * Database utility functions for performance optimization and error handling
 */

// Connection pool monitoring
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return { healthy: true, latency };
  } catch (error) {
    logger.error('Database health check failed:', error as Error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Batch operations for better performance
export async function batchCreateUsers(
  users: Array<{
    email: string;
    name?: string;
    role: string;
    hashedPassword?: string;
  }>
) {
  try {
    const result = await prisma.user.createMany({
      data: users,
    });

    logger.info(`Batch created ${result.count} users`);
    return result;
  } catch (error) {
    logger.error('Batch user creation failed:', error as Error);
    throw error;
  }
}

// Optimized user lookup with caching considerations
export async function findUserWithPermissions(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
      },
    });
  } catch (error) {
    logger.error('Error finding user with permissions:', error as Error);
    return null;
  }
}

// Optimized metrics query with proper indexing
export async function getAgentMetricsOptimized(agentId: string, year: number, month?: number) {
  try {
    const whereClause = {
      agentId,
      year,
      ...(month && { month }),
    };

    return await prisma.agentMetric.findMany({
      where: whereClause,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: month ? 1 : 12, // Limit results for performance
    });
  } catch (error) {
    logger.error('Error fetching agent metrics:', error as Error);
    return [];
  }
}

// Transaction wrapper with retry logic
export async function withTransaction<T>(
  operation: (
    tx: Omit<
      typeof prisma,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >
  ) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await prisma.$transaction(
        async tx => {
          return await operation(tx);
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('Unique constraint') ||
          error.message.includes('Foreign key constraint'))
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        logger.error(`Transaction failed after ${maxRetries} attempts:`, error as Error);
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 100;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: error as Error,
        attempt,
        delay,
      });
    }
  }

  throw lastError!;
}

// Cleanup old records for maintenance
export async function cleanupOldAuditLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old audit log entries`);
    return result.count;
  } catch (error) {
    logger.error('Error cleaning up audit logs:', error as Error);
    return 0;
  }
}

// Database statistics for monitoring
export async function getDatabaseStats() {
  try {
    const [userCount, sessionCount, metricCount, auditLogCount] = await Promise.all([
      prisma.user.count(),
      prisma.coachingSession.count(),
      prisma.agentMetric.count(),
      prisma.auditLog.count(),
    ]);

    return {
      users: userCount,
      sessions: sessionCount,
      metrics: metricCount,
      auditLogs: auditLogCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting database stats:', error as Error);
    return null;
  }
}

// Graceful shutdown helper
export async function gracefulShutdown() {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed gracefully');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error as Error);
  }
}

// Connection retry logic
export async function ensureConnection(maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await prisma.$connect();
      logger.info('Database connection established');
      return true;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt} failed:`, error as Error);

      if (attempt === maxRetries) {
        throw new Error('Failed to establish database connection after maximum retries');
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}
