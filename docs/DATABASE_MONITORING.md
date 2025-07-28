# Database Query Monitoring Guide

This guide covers the comprehensive database monitoring system for the SmartSource Coaching Hub, including query performance tracking, slow query detection, and optimization recommendations.

## Overview

The database monitoring system provides:
- **Real-time Query Tracking**: Monitor all database operations with performance metrics
- **Slow Query Detection**: Automatic identification and alerting for slow queries
- **Performance Analytics**: Detailed statistics and trends analysis
- **Query Optimization**: Recommendations for improving database performance
- **Monitoring API**: RESTful endpoints for accessing monitoring data

## Architecture

### Components

1. **MonitoredPrismaClient**: Enhanced Prisma client with built-in monitoring
2. **Query Statistics Collector**: In-memory statistics aggregation
3. **Prisma Middleware**: Automatic query interception and logging
4. **Monitoring API**: HTTP endpoints for accessing performance data
5. **Performance Thresholds**: Configurable performance categories

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  FAST: 50,      // < 50ms - optimal performance
  NORMAL: 200,   // 50-200ms - acceptable performance
  SLOW: 1000,    // 200-1000ms - slow queries (warning)
  CRITICAL: 5000 // > 1000ms - critical slow queries (alert)
};
```

## Implementation

### 1. Enhanced Prisma Client

The `MonitoredPrismaClient` automatically tracks all database operations:

```typescript
import { prisma } from '@/lib/database-monitor';

// All queries are automatically monitored
const users = await prisma.user.findMany({
  where: { active: true }
});

// Manual monitoring for complex operations
const result = await prisma.monitoredOperation(
  'findMany',
  'User',
  () => prisma.user.findMany({ include: { sessions: true } }),
  { userId: 'current-user-id' }
);
```

### 2. Prisma Middleware

Automatic query monitoring through middleware:

```typescript
import { addMonitoringToPrisma } from '@/lib/prisma-middleware';

// Add monitoring to existing Prisma client
addMonitoringToPrisma(prisma, { requestId: 'req-123' });
```

### 3. Query Statistics

Access real-time query statistics:

```typescript
import { queryMonitor } from '@/lib/database-monitor';

// Get current statistics
const stats = queryMonitor.getStats();
console.log(`Total queries: ${stats.totalQueries}`);
console.log(`Average duration: ${stats.averageDuration}ms`);
console.log(`Slow queries: ${stats.slowQueries}`);

// Get recent slow queries
const slowQueries = queryMonitor.getSlowQueries(10);

// Generate performance report
const report = queryMonitor.generateReport();
```

## Monitoring API

### Endpoints

#### GET `/api/monitoring/database`

Retrieve comprehensive database performance metrics:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "totalQueries": 1250,
    "averageDuration": 45.2,
    "slowQueryPercentage": 2.4,
    "errorRate": 0.1
  },
  "performance": {
    "fast": 1000,
    "normal": 220,
    "slow": 25,
    "critical": 5
  },
  "topSlowModels": [
    {
      "model": "Session",
      "count": 150,
      "averageDuration": 180.5,
      "slowCount": 12
    }
  ],
  "topSlowOperations": [
    {
      "operation": "findMany",
      "count": 800,
      "averageDuration": 65.2,
      "slowCount": 15
    }
  ],
  "recentSlowQueries": [
    {
      "operation": "findMany",
      "model": "User",
      "duration": 1250,
      "performance": "slow",
      "recordCount": 500
    }
  ]
}
```

#### POST `/api/monitoring/database`

Reset monitoring statistics (admin only):

```json
{
  "message": "Database monitoring statistics reset successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Query Performance Categories

### Fast Queries (< 50ms)
- **Status**: Optimal performance
- **Action**: No action required
- **Logging**: Debug level only

### Normal Queries (50-200ms)
- **Status**: Acceptable performance
- **Action**: Monitor trends
- **Logging**: Debug level

### Slow Queries (200-1000ms)
- **Status**: Performance warning
- **Action**: Review and optimize
- **Logging**: Warning level
- **Sentry**: Breadcrumb added

### Critical Queries (> 1000ms)
- **Status**: Critical performance issue
- **Action**: Immediate optimization required
- **Logging**: Error level
- **Sentry**: Error captured

## Monitoring Features

### 1. Automatic Query Tracking

All database operations are automatically monitored:

```typescript
// These operations are automatically tracked
await prisma.user.findMany();           // findMany operation
await prisma.user.create({ data: {} }); // create operation
await prisma.user.update({ ... });      // update operation
await prisma.user.delete({ ... });      // delete operation
```

### 2. Batch Operation Monitoring

Special handling for batch operations:

```typescript
// Batch operations include additional metrics
await prisma.user.createMany({
  data: [/* multiple records */]
}); // Tracks batch size and per-record performance
```

### 3. Transaction Monitoring

Transaction-level performance tracking:

```typescript
await prisma.$transaction(async (tx) => {
  // All operations within transaction are tracked
  // Transaction duration is monitored separately
});
```

### 4. Connection Monitoring

Database connection health monitoring:

```typescript
// Connection events are automatically logged
await prisma.$connect();    // Connection establishment
await prisma.$disconnect(); // Connection termination
```

## Performance Analysis

### 1. Query Statistics

The system tracks comprehensive statistics:

- **Total Queries**: Count of all database operations
- **Average Duration**: Mean query execution time
- **Performance Distribution**: Breakdown by performance category
- **Error Rate**: Percentage of failed queries
- **Model Statistics**: Performance by database model
- **Operation Statistics**: Performance by operation type

### 2. Trend Analysis

Monitor performance trends over time:

```typescript
const report = queryMonitor.generateReport();

// Identify performance degradation
if (report.summary.slowQueryPercentage > 5) {
  console.warn('High slow query percentage detected');
}

// Monitor specific models
const userModelStats = report.topSlowModels.find(m => m.model === 'User');
if (userModelStats && userModelStats.averageDuration > 100) {
  console.warn('User model queries are slow');
}
```

### 3. Slow Query Analysis

Detailed analysis of slow queries:

```typescript
const slowQueries = queryMonitor.getSlowQueries(20);

// Group by model
const byModel = slowQueries.reduce((acc, query) => {
  acc[query.model] = (acc[query.model] || 0) + 1;
  return acc;
}, {});

// Group by operation
const byOperation = slowQueries.reduce((acc, query) => {
  acc[query.operation] = (acc[query.operation] || 0) + 1;
  return acc;
}, {});
```

## Optimization Recommendations

### 1. Index Optimization

Based on slow query patterns:

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_session_user_id ON "Session"(userId);
CREATE INDEX idx_action_item_status ON "ActionItem"(status);

-- Composite indexes for complex queries
CREATE INDEX idx_session_user_status ON "Session"(userId, status);
CREATE INDEX idx_action_item_user_due ON "ActionItem"(userId, dueDate);
```

### 2. Query Optimization

Common optimization strategies:

```typescript
// Instead of loading all relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { sessions: true, actionItems: true } // Loads everything
});

// Load only what you need
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { 
    sessions: { 
      where: { status: 'active' },
      take: 10 
    }
  }
});
```

### 3. Pagination

Implement efficient pagination:

```typescript
// Use cursor-based pagination for large datasets
const sessions = await prisma.session.findMany({
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' }
});
```

### 4. Connection Pooling

Optimize database connections:

```typescript
// Configure connection pooling in Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_POOLED // Use PgBouncer
    }
  }
});
```

## Alerting and Notifications

### 1. Slow Query Alerts

Configure alerts for slow queries:

```typescript
// Custom alert logic
const stats = queryMonitor.getStats();
if (stats.slowQueries > stats.totalQueries * 0.05) {
  // Send alert: > 5% slow queries
  sendSlowQueryAlert(stats);
}
```

### 2. Performance Degradation

Monitor performance trends:

```typescript
// Track performance over time
const currentAvg = stats.averageDuration;
const previousAvg = getPreviousAverageDuration();

if (currentAvg > previousAvg * 1.5) {
  // Send alert: 50% performance degradation
  sendPerformanceDegradationAlert(currentAvg, previousAvg);
}
```

### 3. Error Rate Monitoring

Monitor database error rates:

```typescript
const errorRate = stats.errorCount / stats.totalQueries;
if (errorRate > 0.01) {
  // Send alert: > 1% error rate
  sendErrorRateAlert(errorRate);
}
```

## Dashboard Integration

### 1. Grafana Dashboard

Create monitoring dashboards:

```json
{
  "dashboard": {
    "title": "Database Performance",
    "panels": [
      {
        "title": "Query Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(database_query_duration_ms)",
            "legendFormat": "Average Duration"
          }
        ]
      },
      {
        "title": "Slow Query Count",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(database_slow_queries_total)",
            "legendFormat": "Slow Queries"
          }
        ]
      }
    ]
  }
}
```

### 2. Custom Monitoring Dashboard

Build custom monitoring interface:

```typescript
// React component for monitoring dashboard
function DatabaseMonitoringDashboard() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/monitoring/database')
      .then(res => res.json())
      .then(setStats);
  }, []);
  
  return (
    <div>
      <h2>Database Performance</h2>
      <div>Total Queries: {stats?.summary.totalQueries}</div>
      <div>Average Duration: {stats?.summary.averageDuration}ms</div>
      <div>Slow Query %: {stats?.summary.slowQueryPercentage}%</div>
    </div>
  );
}
```

## Production Deployment

### 1. Environment Configuration

Production-specific settings:

```env
# Enable query logging
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=20"

# Performance monitoring
LOG_LEVEL=info
ENABLE_QUERY_MONITORING=true
SLOW_QUERY_THRESHOLD=200
CRITICAL_QUERY_THRESHOLD=1000
```

### 2. Monitoring Setup

Configure production monitoring:

```typescript
// Production monitoring configuration
const prisma = new MonitoredPrismaClient();

// Add request context to all queries
app.use((req, res, next) => {
  req.prisma = prisma.child({
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
  });
  next();
});
```

### 3. Performance Tuning

Production performance optimizations:

- Enable connection pooling with PgBouncer
- Configure appropriate connection limits
- Set up read replicas for read-heavy operations
- Implement query result caching
- Monitor and optimize slow queries regularly

## Troubleshooting

### 1. High Query Volume

```bash
# Check query distribution
curl /api/monitoring/database | jq '.topSlowOperations'

# Identify problematic models
curl /api/monitoring/database | jq '.topSlowModels'
```

### 2. Slow Query Investigation

```typescript
// Get detailed slow query information
const slowQueries = queryMonitor.getSlowQueries(50);
const patterns = analyzeQueryPatterns(slowQueries);

// Common slow query patterns
patterns.forEach(pattern => {
  console.log(`Pattern: ${pattern.type}`);
  console.log(`Count: ${pattern.count}`);
  console.log(`Average Duration: ${pattern.avgDuration}ms`);
});
```

### 3. Memory Usage

Monitor query statistics memory usage:

```typescript
// Reset statistics if memory usage is high
if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
  queryMonitor.reset();
  logger.info('Query statistics reset due to high memory usage');
}
```

## Best Practices

### 1. Query Design

- Use specific field selection instead of `select *`
- Implement proper pagination for large datasets
- Use appropriate indexes for query patterns
- Avoid N+1 query problems with proper includes

### 2. Monitoring

- Set up automated alerts for performance degradation
- Regularly review slow query reports
- Monitor trends over time, not just current values
- Use monitoring data to guide optimization efforts

### 3. Performance

- Implement connection pooling in production
- Use read replicas for read-heavy operations
- Cache frequently accessed data
- Optimize database schema based on query patterns

## Next Steps

After implementing database monitoring:
1. **Phase 2**: Code Quality & Architecture Refinement
2. **Query Optimization**: Implement specific optimizations based on monitoring data
3. **Advanced Monitoring**: Add custom metrics and business intelligence
4. **Automated Optimization**: Implement automatic query optimization suggestions

The comprehensive database monitoring system provides deep visibility into database performance, enabling proactive optimization and ensuring optimal application performance.