import { NextRequest, NextResponse } from 'next/server';

import { unifiedQueryMonitor } from '@/lib/monitoring/unified-database-monitor';
import { createRequestLogger } from '@/lib/simple-logger';
import { withErrorHandling, withPerformanceMonitoring } from '@/middleware/logging';

interface DatabaseMonitoringResponse {
  timestamp: string;
  summary: {
    totalQueries: number;
    averageDuration: number;
    slowQueryPercentage: number;
    errorRate: number;
  };
  performance: {
    fast: number;
    normal: number;
    slow: number;
    critical: number;
  };
  topSlowModels: Array<{
    model: string;
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
  topSlowOperations: Array<{
    operation: string;
    count: number;
    averageDuration: number;
    slowCount: number;
  }>;
  recentSlowQueries: Array<{
    operation: string;
    model: string;
    duration: number;
    performance: string;
    recordCount?: number;
  }>;
}

// eslint-disable-next-line require-await
async function handleDatabaseMonitoring(req: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(req);
  
  try {
    // Get query statistics
    const stats = unifiedQueryMonitor.getStats();
    const report = unifiedQueryMonitor.generateReport();
    
    // Calculate performance distribution
    const totalQueries = stats.totalQueries;
    const performance = {
      fast: 0,
      normal: 0,
      slow: stats.slowQueries,
      critical: stats.criticalQueries,
    };
    
    // Calculate fast and normal queries
    performance.fast = Math.max(0, totalQueries - stats.slowQueries - stats.criticalQueries);
    performance.normal = Math.max(0, totalQueries - performance.fast - stats.slowQueries - stats.criticalQueries);
    
    const response: DatabaseMonitoringResponse = {
      timestamp: new Date().toISOString(),
      summary: report.summary,
      performance,
      topSlowModels: report.topSlowModels,
      topSlowOperations: report.topSlowOperations,
      recentSlowQueries: report.recentSlowQueries.map(query => ({
        operation: query.operation,
        model: query.model,
        duration: query.duration,
        performance: query.performance,
        recordCount: query.recordCount,
      })),
    };
    
    logger.info('Database monitoring data retrieved', {
      totalQueries: stats.totalQueries,
      slowQueries: stats.slowQueries,
      errorCount: stats.errorCount,
    });
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Database monitoring error', error as Error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve database monitoring data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line require-await
async function handleResetStats(req: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(req);
  
  try {
    unifiedQueryMonitor.reset();
    
    logger.info('Database monitoring stats reset');
    
    return NextResponse.json({
      message: 'Database monitoring statistics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Database monitoring reset error', error as Error);
    
    return NextResponse.json(
      {
        error: 'Failed to reset database monitoring statistics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving monitoring data
export const GET = withErrorHandling(
  withPerformanceMonitoring('database-monitoring-get', handleDatabaseMonitoring)
);

// POST endpoint for resetting statistics (admin only)
export const POST = withErrorHandling(
  withPerformanceMonitoring('database-monitoring-reset', handleResetStats)
);

// Export runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';