# Scorecard Service Module

## Overview

This module provides a refactored, modular approach to handling scorecard operations. It replaces the original 479-line monolithic API route with focused, maintainable modules that follow separation of concerns principles.

## Architecture

The scorecard module is organized into four main components:

### 1. Core Service (`scorecard-service.ts`)
- **Purpose**: Database operations and business logic
- **Responsibilities**:
  - Permission checking and validation
  - Database queries and mutations
  - Access control based on role hierarchy
  - Logging and error handling

### 2. Calculations (`scorecard-calculations.ts`)
- **Purpose**: Mathematical operations and data processing
- **Responsibilities**:
  - Trend calculations
  - Yearly average computations
  - Metrics processing (new vs legacy scorecard formats)
  - Database data preparation

### 3. Request Handlers (`scorecard-handlers.ts`)
- **Purpose**: HTTP request/response handling
- **Responsibilities**:
  - Request validation
  - Response formatting
  - Error handling and status codes
  - Orchestrating service and calculation calls

### 4. API Route (`route.ts`)
- **Purpose**: Minimal route definitions
- **Responsibilities**:
  - HTTP method routing (GET, POST, DELETE)
  - Delegating to appropriate handlers

## Key Features

### ✅ Modular Architecture
- **Before**: 479-line monolithic file
- **After**: 4 focused modules with clear responsibilities
- **Benefits**: Better maintainability, testability, and code reuse

### ✅ Type Safety
- Comprehensive TypeScript interfaces
- Proper type definitions for all data structures
- Runtime type validation where needed

### ✅ Permission Management
- Role-based access control (RBAC)
- Hierarchical permission checking
- Secure data access patterns

### ✅ Dual Scorecard Support
- Legacy scorecard format (1-5 scale metrics)
- New scorecard format (raw data with calculated metrics)
- Backward compatibility maintained

### ✅ Comprehensive Error Handling
- Structured error responses
- Detailed logging for debugging
- Graceful failure handling

## Usage Examples

### Basic Import
```typescript
import { 
  ScorecardService, 
  ScorecardCalculations,
  handleGetScorecard 
} from '@/lib/services/scorecard';
```

### Service Operations
```typescript
// Check permissions
const canView = await ScorecardService.checkViewPermission(userRole);

// Get agent data
const agent = await ScorecardService.getAgentData(agentId);

// Get metrics
const whereConditions = ScorecardService.buildQueryConditions(agentId, { year, month });
const metrics = await ScorecardService.getAgentMetrics(whereConditions);
```

### Calculations
```typescript
// Calculate trends
const trends = ScorecardCalculations.calculateTrends(currentMetric, previousMetric);

// Calculate yearly average
const yearlyAverage = ScorecardCalculations.calculateYearlyAverage(metrics);

// Process metrics input
const result = ScorecardCalculations.processMetricsInput(rawData, metrics, weights);
```

## API Endpoints

### GET `/api/agents/[id]/scorecard`
- **Purpose**: Retrieve agent scorecard metrics
- **Parameters**: 
  - `year` (optional): Target year
  - `month` (optional): Target month
- **Response**: Agent data, metrics, trends, yearly average

### POST `/api/agents/[id]/scorecard`
- **Purpose**: Create or update agent metrics
- **Body**: Month, year, rawData/metrics, weights, notes
- **Response**: Created/updated metric record

### DELETE `/api/agents/[id]/scorecard`
- **Purpose**: Delete agent metrics
- **Parameters**: `month`, `year` (required)
- **Response**: Success confirmation

## Permission Matrix

| Role | View Scorecards | Modify Scorecards | Delete Scorecards |
|------|----------------|-------------------|-------------------|
| AGENT | Own data only | ❌ | ❌ |
| TEAM_LEADER | Team members + own | ✅ | ❌ |
| MANAGER | All data | ✅ | ✅ |
| ADMIN | All data | ✅ | ✅ |

## Data Flow

```
Request → Handler → Service → Database
                 ↓
              Calculations
                 ↓
              Response
```

1. **Request Processing**: Handler validates input and checks permissions
2. **Service Layer**: Performs database operations and business logic
3. **Calculations**: Processes data and performs mathematical operations
4. **Response**: Formatted response with proper error handling

## Migration Benefits

### Performance Improvements
- **Reduced Complexity**: Smaller, focused functions are easier to optimize
- **Better Caching**: Modular structure allows for targeted caching strategies
- **Improved Testability**: Individual components can be unit tested

### Maintainability Gains
- **Clear Separation**: Each module has a single responsibility
- **Easier Debugging**: Issues can be isolated to specific modules
- **Code Reusability**: Services can be reused across different endpoints

### Security Enhancements
- **Centralized Permission Logic**: All permission checks in one place
- **Consistent Error Handling**: Standardized error responses
- **Better Logging**: Structured logging for audit trails

## Error Handling

The module implements comprehensive error handling:

```typescript
try {
  // Operation
} catch (error) {
  ScorecardService.logError('operation', error as Error, agentId);
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  );
}
```

## Logging

Structured logging is implemented throughout:

```typescript
// Operation logging
ScorecardService.logOperation('fetch', agentId, { year, month });

// Error logging
ScorecardService.logError('create/update', error, agentId);
```

## Future Enhancements

1. **Caching Layer**: Add Redis caching for frequently accessed data
2. **Batch Operations**: Support for bulk scorecard operations
3. **Real-time Updates**: WebSocket support for live scorecard updates
4. **Advanced Analytics**: Additional calculation methods and insights
5. **Export Functionality**: PDF/Excel export capabilities

## Testing

Each module can be independently tested:

```typescript
// Service tests
describe('ScorecardService', () => {
  test('should check permissions correctly', async () => {
    // Test implementation
  });
});

// Calculation tests
describe('ScorecardCalculations', () => {
  test('should calculate trends accurately', () => {
    // Test implementation
  });
});
```

## Dependencies

- `@prisma/client`: Database operations
- `next/server`: HTTP handling
- `@/lib/auth-server`: Authentication
- `@/lib/rbac`: Role-based access control
- `@/lib/calculation-utils`: Mathematical utilities
- `@/lib/logger`: Logging functionality

## File Structure

```
src/lib/services/scorecard/
├── index.ts                 # Module exports
├── scorecard-service.ts     # Core service logic
├── scorecard-calculations.ts # Mathematical operations
├── scorecard-handlers.ts    # HTTP request handlers
└── README.md               # This documentation
```

This refactored architecture provides a solid foundation for future development while maintaining backward compatibility and improving code quality.