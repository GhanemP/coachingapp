# Application Performance Monitoring (APM) Setup Guide

This guide covers the comprehensive monitoring setup for the SmartSource Coaching Hub, including Sentry integration, logging infrastructure, and performance monitoring.

## Overview

The monitoring system includes:

- **Sentry**: Error tracking, performance monitoring, and user session replay
- **Winston**: Structured logging with multiple transports
- **Health Checks**: System health monitoring endpoints
- **Performance Metrics**: Request timing and database query monitoring
- **Security Logging**: Authentication and security event tracking

## Sentry Configuration

### 1. Environment Setup

Add the following environment variables to your `.env` file:

```env
# Sentry Configuration
SENTRY_DSN="your-sentry-dsn-here"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
SENTRY_RELEASE="coaching-app@1.0.0"

# Optional: Authentication token for source map uploads
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

### 2. Sentry Features

#### Error Tracking

- Automatic error capture on client and server
- Stack trace analysis with source maps
- Error grouping and deduplication
- Custom error filtering for development vs production

#### Performance Monitoring

- Request/response timing
- Database query performance
- Custom performance metrics
- Transaction tracing

#### Session Replay

- User session recording for debugging
- Privacy-focused with text masking
- Error-triggered replay capture

### 3. Configuration Files

The Sentry setup includes three configuration files:

- **`sentry.client.config.ts`**: Client-side configuration with replay integration
- **`sentry.server.config.ts`**: Server-side configuration with HTTP and Prisma integration
- **`sentry.edge.config.ts`**: Edge runtime configuration for middleware

## Logging Infrastructure

### 1. Logger Features

The custom logger (`src/lib/logger.ts`) provides:

- **Structured Logging**: JSON format with consistent fields
- **Multiple Log Levels**: error, warn, info, http, debug
- **Context Enrichment**: Request ID, user ID, session tracking
- **Performance Logging**: Operation timing and metrics
- **Security Logging**: Authentication and security events
- **Database Logging**: Query performance and errors

### 2. Usage Examples

```typescript
import { logger, createLogger } from '@/lib/logger';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', error);

// Context-aware logging
const requestLogger = createLogger({
  requestId: 'req-123',
  userId: 'user-456',
});

requestLogger.performance('user-lookup', 150);
requestLogger.auth('login-success', 'user-456');
requestLogger.security('suspicious-activity', 'high', {
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});
```

### 3. Log Transports

#### Development

- Console output with colors and formatting
- Real-time log streaming

#### Production

- File-based logging with rotation
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Maximum file size: 5MB
- Retention: 5 files

## Middleware Integration

### 1. Request Logging

The logging middleware (`src/middleware/logging.ts`) provides:

```typescript
import { withRequestLogging, withErrorHandling } from '@/middleware/logging';

export const GET = withRequestLogging(
  withErrorHandling(async (req, context) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  })
);
```

### 2. Performance Monitoring

```typescript
import { withPerformanceMonitoring } from '@/middleware/logging';

export const POST = withPerformanceMonitoring('create-user', async req => {
  // Handler logic
});
```

### 3. Database Operation Logging

```typescript
import { logDatabaseOperation } from '@/middleware/logging';

const users = await logDatabaseOperation('SELECT', 'User', () => prisma.user.findMany(), req);
```

## Health Check Endpoint

### 1. Endpoint: `/api/health`

The health check endpoint provides comprehensive system status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12
    }
  },
  "uptime": 86400,
  "memory": {
    "used": 134217728,
    "total": 268435456,
    "percentage": 50
  }
}
```

### 2. Status Codes

- **200**: Healthy or degraded (non-critical issues)
- **503**: Unhealthy (critical systems down)

### 3. Monitoring Integration

Use the health endpoint for:

- Load balancer health checks
- Uptime monitoring services
- Automated alerting systems
- Container orchestration health probes

## Performance Metrics

### 1. Automatic Metrics

The system automatically tracks:

- **Request Duration**: Time to process HTTP requests
- **Database Query Time**: Individual query performance
- **Memory Usage**: Heap usage and garbage collection
- **Error Rates**: Error frequency and types
- **User Sessions**: Session duration and activity

### 2. Custom Metrics

Add custom performance tracking:

```typescript
import { measurePerformance } from '@/lib/logger';

const result = await measurePerformance(
  'complex-calculation',
  async () => {
    // Your complex operation
    return await performCalculation();
  },
  logger
);
```

### 3. Performance Thresholds

Default performance thresholds:

- API responses: < 500ms (warning), < 1000ms (error)
- Database queries: < 100ms (optimal), < 500ms (warning)
- Memory usage: < 80% (warning), < 95% (critical)

## Security Monitoring

### 1. Security Events

The system logs security-relevant events:

- Authentication attempts (success/failure)
- Authorization failures
- Rate limit violations
- Suspicious activity patterns
- Data access attempts

### 2. Security Logging

```typescript
// Authentication events
logger.auth('login-success', userId);
logger.auth('login-failure', undefined, { ip, userAgent });

// Security events
logger.security('rate-limit-exceeded', 'medium', {
  ip: clientIp,
  endpoint: req.url,
});

logger.security('unauthorized-access', 'high', {
  userId,
  resource: 'admin-panel',
  ip: clientIp,
});
```

### 3. Alert Configuration

Configure alerts for:

- Multiple failed login attempts
- Rate limit violations
- Unauthorized access attempts
- Unusual data access patterns

## Monitoring Dashboard

### 1. Sentry Dashboard

Access your Sentry dashboard for:

- Real-time error tracking
- Performance monitoring
- Release tracking
- User impact analysis

### 2. Log Analysis

For log analysis, consider integrating:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana + Loki** for log aggregation
- **DataDog** for comprehensive monitoring
- **New Relic** for APM

### 3. Custom Dashboards

Create custom dashboards for:

- Application performance metrics
- Business metrics (user activity, feature usage)
- System health indicators
- Security event monitoring

## Alerting Configuration

### 1. Error Alerts

Configure alerts for:

- Error rate > 1% over 5 minutes
- New error types introduced
- Critical errors (500 status codes)
- Database connection failures

### 2. Performance Alerts

Set up alerts for:

- Response time > 2 seconds (95th percentile)
- Database query time > 1 second
- Memory usage > 90%
- High CPU utilization

### 3. Security Alerts

Configure security alerts for:

- Multiple failed authentication attempts
- Unusual access patterns
- Rate limit violations
- Privilege escalation attempts

## Production Deployment

### 1. Environment Configuration

Production-specific settings:

```env
# Reduce sampling rates for production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1

# Enable production logging
LOG_LEVEL=info
NODE_ENV=production
```

### 2. Log Management

For production:

- Set up log rotation and archival
- Configure centralized log collection
- Implement log retention policies
- Set up log-based alerting

### 3. Monitoring Best Practices

- Monitor key business metrics
- Set up synthetic monitoring
- Implement distributed tracing
- Regular monitoring system health checks

## Troubleshooting

### 1. Common Issues

#### Sentry Not Receiving Events

```bash
# Check DSN configuration
echo $SENTRY_DSN

# Verify network connectivity
curl -I https://sentry.io

# Check Sentry configuration
npm run build
```

#### High Log Volume

```bash
# Check log levels
grep -c "ERROR" logs/combined.log
grep -c "WARN" logs/combined.log

# Adjust log level
export LOG_LEVEL=warn
```

#### Performance Issues

```bash
# Check memory usage
node --inspect server.js

# Monitor garbage collection
node --trace-gc server.js
```

### 2. Debug Mode

Enable debug mode for troubleshooting:

```env
# Enable Sentry debug mode
SENTRY_DEBUG=true

# Enable verbose logging
LOG_LEVEL=debug
```

## Maintenance

### 1. Regular Tasks

- Review error trends weekly
- Update performance thresholds monthly
- Clean up old log files
- Review and update alert configurations

### 2. Monitoring System Health

- Monitor Sentry quota usage
- Check log storage capacity
- Verify alert delivery
- Test monitoring system failover

## Next Steps

After implementing APM:

1. **Phase 1.3.2**: Database Query Monitoring
2. **Phase 2**: Code Quality & Architecture Refinement
3. **Advanced Monitoring**: Custom metrics and business intelligence
4. **Observability**: Distributed tracing and service mesh monitoring

The comprehensive monitoring setup provides visibility into application performance, errors, and security events, enabling proactive issue resolution and system optimization.
