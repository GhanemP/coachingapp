import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Log the health check request
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  logger.debug('Health check requested', { ip });
  try {
    // Check database connectivity
    const dbCheck = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Basic health information
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbCheck ? 'connected' : 'disconnected',
        type: 'sqlite' // Based on current schema
      },
      services: {
        redis: process.env.REDIS_URL ? 'configured' : 'not_configured',
        websocket: 'enabled',
        auth: 'nextauth'
      }
    };

    logger.info('Health check performed', { 
      status: healthData.status,
      database: healthData.database.status 
    });

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        status: 'error'
      }
    };

    return NextResponse.json(errorData, { status: 503 });
  }
}

// HEAD method for simple health checks
export async function HEAD(request: NextRequest) {
  // Log the HEAD health check request
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  logger.debug('HEAD health check requested', { ip });
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    logger.error('HEAD health check failed:', error);
    return new NextResponse(null, { status: 503 });
  }
}