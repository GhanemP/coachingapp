# Database Monitoring System Migration Guide

## Overview

The database monitoring system has been consolidated from three redundant implementations into a single, unified system:

### Replaced Files:
- ❌ `src/lib/database-monitor.ts` (Full-featured monitoring with Sentry)
- ❌ `src/lib/simple-database-monitor.ts` (Simplified monitoring)
- ❌ `src/lib/database-optimizer.ts` (Performance monitoring with optimization)

### New Unified System:
- ✅ `src/lib/monitoring/unified-database-monitor.ts` (Consolidated all functionality)

## Migration Steps

### 1. Import Changes

**Before:**
```typescript
// Old imports
import { queryMonitor } from '@/lib/database-monitor';
import { queryMonitor } from '@/lib/simple-database-monitor';
import { queryMonitor } from '@/lib/database-optimizer';
```

**After:**
```typescript
// New unified import
import { unifiedQueryMonitor, prisma, monitoredOperation } from '@/lib/monitoring/unified-database-monitor';

// For backward compatibility, you can also use:
import { queryMonitor } from '@/lib/monitoring/unified-database-monitor';
```

### 2. API Changes

The unified system maintains backward compatibility with existing APIs:

```typescript
// All these methods work the same way
const stats = unifiedQueryMonitor.getStats();
const report = unifiedQueryMonitor.generateReport();
const recentQueries = unifiedQueryMonitor.getRecentQueries(50);
const slowQueries = unifiedQueryMonitor.getSlowQueries(20);
unifiedQueryMonitor.reset();

// New health check functionality
const health = await unifiedQueryMonitor.checkHealth();
```

### 3. Database Operations

**Before:**
```typescript
// Old way with multiple monitoring systems
import { prisma } from '@/lib/database-monitor';
import { monitoredOperation } from '@/lib/simple-database-monitor';
```

**After:**
```typescript
// New unified way
import { prisma, monitoredOperation } from '@/lib/monitoring/unified-database-monitor';

// Usage remains the same
const users = await monitoredOperation('findMany', 'User', async () => {
  return await prisma.user.findMany();
});
```

### 4. Performance Thresholds

The unified system uses consistent performance thresholds:

```typescript
export const PERFORMANCE_THRESHOLDS = {
  FAST: 50,      // < 50ms - optimal
  NORMAL: 200,   // 50-200ms - acceptable
  SLOW: 1000,    // 200-1000ms - slow
  CRITICAL: 5000 // > 5000ms - critical
} as const;
```

### 5. Health Monitoring

New unified health check functionality:

```typescript
import { checkDatabaseHealth } from '@/lib/monitoring/unified-database-monitor';

const health = await checkDatabaseHealth();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
console.log(health.responseTime); // Response time in ms
console.log(health.details); // Connection and performance details
```

## Benefits of Consolidation

### 1. **Reduced Complexity**
- Single monitoring system instead of three
- Consistent API across all database operations
- Unified configuration and thresholds

### 2. **Better Performance**
- Eliminated duplicate monitoring overhead
- Single stats collection system
- Optimized memory usage

### 3. **Improved Maintainability**
- Single codebase to maintain
- Consistent error handling
- Unified logging approach

### 4. **Enhanced Features**
- Combined best features from all three systems
- Comprehensive performance reporting
- Built-in health monitoring

## Files Updated

### API Routes
- ✅ `src/app/api/monitoring/database/route.ts` - Updated to use unified system

### Repository Pattern
- ✅ `src/lib/repositories/` - Uses unified monitoring for database operations

### Middleware
- ✅ Database operations now use consistent monitoring

## Backward Compatibility

The unified system maintains full backward compatibility:

- All existing `queryMonitor` method calls continue to work
- Performance thresholds remain consistent
- Logging format is preserved
- API response formats are unchanged

## Testing

After migration, verify:

1. **Database monitoring API endpoint** (`/api/monitoring/database`)
2. **Query performance logging** in application logs
3. **Health check functionality** works correctly
4. **Statistics collection** is functioning properly

## Cleanup

The following files can be safely removed after migration:

```bash
# Remove old monitoring files
rm src/lib/database-monitor.ts
rm src/lib/simple-database-monitor.ts
rm src/lib/database-optimizer.ts
```

## Support

If you encounter any issues during migration:

1. Check import statements are updated
2. Verify method names match the unified API
3. Ensure performance thresholds are as expected
4. Test database health monitoring functionality

The unified system provides all functionality from the previous three systems with improved performance and maintainability.