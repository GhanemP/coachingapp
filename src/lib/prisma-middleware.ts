import { Prisma } from '@prisma/client';

import { logger, LogContext } from './logger';

// Performance thresholds in milliseconds
const PERFORMANCE_THRESHOLDS = {
  FAST: 50,
  NORMAL: 200,
  SLOW: 1000,
  CRITICAL: 5000,
} as const;

// Query performance tracking
interface QueryPerformanceData {
  model: string;
  action: string;
  duration: number;
  args?: unknown;
  result?: unknown;
  error?: Error;
}

// Categorize query performance
function categorizePerformance(duration: number): 'fast' | 'normal' | 'slow' | 'critical' {
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
function logQueryPerformance(data: QueryPerformanceData, context?: LogContext): void {
  const { model, action, duration, args, error } = data;
  const performance = categorizePerformance(duration);
  
  const message = `Prisma ${action} on ${model} (${duration}ms)`;
  const logContext = {
    ...context,
    model,
    action,
    duration,
    performance,
    args: args ? JSON.stringify(args).substring(0, 200) : undefined,
  };

  switch (performance) {
    case 'fast':
    case 'normal':
      logger.debug(message, logContext);
      break;
    case 'slow':
      logger.warn(`Slow query: ${message}`, logContext);
      break;
    case 'critical':
      logger.error(`Critical slow query: ${message}`, error, logContext);
      break;
  }
}

// Create Prisma middleware for query monitoring
export function createQueryMonitoringMiddleware(context?: LogContext): Prisma.Middleware {
  return async (params, next) => {
    const startTime = Date.now();
    
    try {
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      // Log the query performance
      logQueryPerformance({
        model: params.model || 'unknown',
        action: params.action,
        duration,
        args: params.args,
        result: Array.isArray(result) ? { count: result.length } : result,
      }, context);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the failed query
      logQueryPerformance({
        model: params.model || 'unknown',
        action: params.action,
        duration,
        args: params.args,
        error: error as Error,
      }, context);
      
      throw error;
    }
  };
}

// Batch operation monitoring middleware
export function createBatchMonitoringMiddleware(context?: LogContext): Prisma.Middleware {
  return async (params, next) => {
    const startTime = Date.now();
    
    // Check if this is a batch operation
    const isBatchOperation = params.action.includes('Many') || 
                           params.action === 'executeRaw' || 
                           params.action === 'queryRaw';
    
    if (!isBatchOperation) {
      return next(params);
    }
    
    try {
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      // Extract batch size information
      let batchSize = 0;
      if (params.action === 'createMany' && params.args?.data) {
        batchSize = Array.isArray(params.args.data) ? params.args.data.length : 1;
      } else if (params.action === 'updateMany' || params.action === 'deleteMany') {
        batchSize = (result as { count?: number })?.count || 0;
      }
      
      const message = `Batch ${params.action} on ${params.model} (${duration}ms, ${batchSize} records)`;
      const performance = categorizePerformance(duration);
      
      const logContext = {
        ...context,
        model: params.model || 'unknown',
        action: params.action,
        duration,
        performance,
        batchSize,
        isBatch: true,
      };
      
      switch (performance) {
        case 'fast':
        case 'normal':
          logger.info(message, logContext);
          break;
        case 'slow':
          logger.warn(`Slow batch operation: ${message}`, logContext);
          break;
        case 'critical':
          logger.error(`Critical slow batch operation: ${message}`, undefined, logContext);
          break;
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(
        `Failed batch ${params.action} on ${params.model} (${duration}ms)`,
        error as Error,
        {
          ...context,
          model: params.model || 'unknown',
          action: params.action,
          duration,
          isBatch: true,
        }
      );
      
      throw error;
    }
  };
}

// Transaction monitoring middleware
export function createTransactionMonitoringMiddleware(context?: LogContext): Prisma.Middleware {
  return async (params, next) => {
    // Only monitor transaction operations
    if (params.action as string !== '$transaction') {
      return next(params);
    }
    
    const startTime = Date.now();
    const transactionId = Math.random().toString(36).substring(7);
    
    logger.info(`Transaction ${transactionId} started`, {
      ...context,
      transactionId,
      action: 'transaction-start',
    });
    
    try {
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      logger.info(`Transaction ${transactionId} completed (${duration}ms)`, {
        ...context,
        transactionId,
        duration,
        action: 'transaction-complete',
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(
        `Transaction ${transactionId} failed (${duration}ms)`,
        error as Error,
        {
          ...context,
          transactionId,
          duration,
          action: 'transaction-failed',
        }
      );
      
      throw error;
    }
  };
}

// Connection monitoring middleware
export function createConnectionMonitoringMiddleware(context?: LogContext): Prisma.Middleware {
  return async (params, next) => {
    // Monitor connection-related operations
    if (params.action as string === '$connect' || params.action as string === '$disconnect') {
      const startTime = Date.now();
      
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        logger.info(`Database ${params.action} completed (${duration}ms)`, {
          ...context,
          action: params.action,
          duration,
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(
          `Database ${params.action} failed (${duration}ms)`,
          error as Error,
          {
            ...context,
            action: params.action,
            duration,
          }
        );
        
        throw error;
      }
    }
    
    return next(params);
  };
}

// Combined middleware factory
export function createDatabaseMonitoringMiddleware(context?: LogContext) {
  return [
    createQueryMonitoringMiddleware(context),
    createBatchMonitoringMiddleware(context),
    createTransactionMonitoringMiddleware(context),
    createConnectionMonitoringMiddleware(context),
  ];
}

// Utility function to add monitoring to existing Prisma client
export function addMonitoringToPrisma(prisma: { $use: (middleware: Prisma.Middleware) => void }, context?: LogContext): void {
  const middlewares = createDatabaseMonitoringMiddleware(context);
  
  middlewares.forEach(middleware => {
    prisma.$use(middleware);
  });
}

const PrismaMiddleware = {
  createQueryMonitoringMiddleware,
  createBatchMonitoringMiddleware,
  createTransactionMonitoringMiddleware,
  createConnectionMonitoringMiddleware,
  createDatabaseMonitoringMiddleware,
  addMonitoringToPrisma,
};

export default PrismaMiddleware;