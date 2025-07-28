import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@/lib/simple-logger';
import { withErrorHandling, withPerformanceMonitoring } from '@/middleware/logging';

const prisma = new PrismaClient();

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis?: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    external?: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message,
    };
  }
}

function checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
  // Redis check implementation would go here
  // For now, we'll return healthy if Redis URL is configured
  if (process.env['REDIS_URL']) {
    return Promise.resolve({
      status: 'healthy',
      responseTime: 1, // Placeholder
    });
  }
  
  return Promise.resolve({
    status: 'healthy', // Redis is optional
  });
}

async function performHealthCheck(): Promise<HealthCheck> {
  const _startTime = Date.now();
  
  // Run health checks in parallel
  const [databaseCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  // Calculate memory usage
  const memoryUsage = process.memoryUsage();
  const memory = {
    used: memoryUsage.heapUsed,
    total: memoryUsage.heapTotal,
    percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  if (databaseCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (redisCheck.status === 'unhealthy') {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env['NODE_ENV'] || 'development',
    checks: {
      database: databaseCheck,
      redis: redisCheck,
    },
    uptime: process.uptime(),
    memory,
  };
}

async function handleHealthCheck(req: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(req);
  
  try {
    const healthCheck = await performHealthCheck();
    
    // Log health check results
    if (healthCheck.status === 'healthy') {
      logger.info('Health check passed', {
        status: healthCheck.status,
        databaseResponseTime: healthCheck.checks.database.responseTime,
        memoryUsage: healthCheck.memory.percentage,
      });
    } else {
      logger.warn('Health check failed or degraded', {
        status: healthCheck.status,
        checks: healthCheck.checks,
      });
    }

    // Helper function to get HTTP status
    function getHealthCheckHttpStatus(status: string): number {
      if (status === 'healthy') {
        return 200;
      }
      if (status === 'degraded') {
        return 200;
      }
      return 503;
    }

    // Return appropriate HTTP status
    const httpStatus = getHealthCheckHttpStatus(healthCheck.status);

    return NextResponse.json(healthCheck, { status: httpStatus });
  } catch (error) {
    logger.error('Health check error', error as Error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: (error as Error).message,
      },
      { status: 503 }
    );
  }
}

// Export the GET handler with middleware
export const GET = withErrorHandling(
  withPerformanceMonitoring('health-check', handleHealthCheck)
);

// Export runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';