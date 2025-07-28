# New Performance Scorecard System Documentation

## Overview

The performance scorecard system has been completely restructured to provide more accurate, transparent, and actionable performance metrics. The new system moves from subjective 1-5 scale ratings to objective percentage-based calculations derived from actual performance data.

## New Scorecard Structure

### Time & Attendance Metrics

#### 1. Schedule Adherence
- **Formula**: `(Actual hours worked / Scheduled hours) × 100`
- **Description**: Measures how well employees stick to their scheduled work hours
- **Weight**: 1.0x (Medium Impact)
- **Target**: 95-100%

#### 2. Attendance Rate
- **Formula**: `(Days present / Total scheduled days) × 100`
- **Description**: Tracks daily attendance consistency
- **Weight**: 0.5x (Low Impact)
- **Target**: 95-100%

#### 3. Punctuality Score
- **Formula**: `(On-time arrivals / Total shifts) × 100`
- **Description**: Measures timeliness of shift starts (within 5 minutes tolerance)
- **Weight**: 0.5x (Low Impact)
- **Target**: 90-100%

#### 4. Break Compliance
- **Formula**: `(Breaks within limit / Total breaks) × 100`
- **Description**: Adherence to scheduled break durations
- **Weight**: 0.5x (Low Impact)
- **Target**: 90-100%

### Performance & Productivity Metrics

#### 5. Task Completion Rate
- **Formula**: `(Tasks completed / Tasks assigned) × 100`
- **Description**: Percentage of assigned tasks successfully completed
- **Weight**: 1.5x (High Impact)
- **Target**: 95-100%

#### 6. Productivity Index
- **Formula**: `(Actual output / Expected output) × 100`
- **Description**: Measures output efficiency against expectations
- **Weight**: 1.5x (High Impact)
- **Target**: 100-120%

#### 7. Quality Score
- **Formula**: `(Error-free tasks / Total tasks) × 100`
- **Description**: Percentage of tasks completed without errors or rework
- **Weight**: 1.5x (High Impact)
- **Target**: 95-100%

#### 8. Efficiency Rate
- **Formula**: `(Standard time / Actual time taken) × 100`
- **Description**: Time efficiency compared to established benchmarks
- **Weight**: 1.0x (Medium Impact)
- **Target**: 90-110%

## Excel Data Import Structure

### Required Columns

Your daily Excel upload must include the following columns:

| Column Name | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| `employeeId` | Text | Unique employee identifier | "EMP001" |
| `employeeName` | Text | Full employee name | "John Smith" |
| `date` | Date | Work date (YYYY-MM-DD) | "2024-01-15" |
| `scheduledStartTime` | Time | Scheduled shift start | "09:00" |
| `scheduledEndTime` | Time | Scheduled shift end | "17:00" |
| `actualClockIn` | Time | Actual clock-in time | "09:03" |
| `actualClockOut` | Time | Actual clock-out time | "17:15" |
| `scheduledBreakStart` | Time | Scheduled break start | "12:00" |
| `scheduledBreakEnd` | Time | Scheduled break end | "12:30" |
| `actualBreakStart` | Time | Actual break start | "12:05" |
| `actualBreakEnd` | Time | Actual break end | "12:35" |
| `tasksAssigned` | Number | Number of tasks assigned | 10 |
| `tasksCompleted` | Number | Number of tasks completed | 9 |
| `errorsCount` | Number | Number of errors made | 1 |
| `outputUnits` | Number | Units of work produced | 850 |
| `expectedOutput` | Number | Expected units for the day | 800 |
| `timePerTask` | Number | Average minutes per task | 45 |
| `standardTimePerTask` | Number | Standard minutes per task | 40 |

### Sample Excel Data

```csv
employeeId,employeeName,date,scheduledStartTime,scheduledEndTime,actualClockIn,actualClockOut,scheduledBreakStart,scheduledBreakEnd,actualBreakStart,actualBreakEnd,tasksAssigned,tasksCompleted,errorsCount,outputUnits,expectedOutput,timePerTask,standardTimePerTask
EMP001,John Smith,2024-01-15,09:00,17:00,09:03,17:15,12:00,12:30,12:05,12:35,10,9,1,850,800,45,40
EMP002,Jane Doe,2024-01-15,09:00,17:00,08:58,17:00,12:00,12:30,12:00,12:28,12,11,0,920,900,42,40
```

## API Endpoints

### Import Scorecard Data
- **Endpoint**: `POST /api/import/scorecard`
- **Authentication**: Required (Manager/Admin only)
- **Payload**:
```json
{
  "data": [/* Excel row data array */],
  "month": 1,
  "year": 2024
}
```

### Get Agent Scorecard
- **Endpoint**: `GET /api/agents/{id}/scorecard`
- **Parameters**:
  - `year`: Target year (optional, defaults to current year)
  - `month`: Target month (optional, returns yearly average if omitted)

### Create/Update Scorecard
- **Endpoint**: `POST /api/agents/{id}/scorecard`
- **Payload** (Raw Data Method):
```json
{
  "month": 1,
  "year": 2024,
  "rawData": {
    "scheduledHours": 160,
    "actualHours": 158.5,
    "scheduledDays": 20,
    "daysPresent": 19,
    "totalShifts": 19,
    "onTimeArrivals": 17,
    "totalBreaks": 38,
    "breaksWithinLimit": 35,
    "tasksAssigned": 200,
    "tasksCompleted": 190,
    "expectedOutput": 16000,
    "actualOutput": 15800,
    "totalTasks": 190,
    "errorFreeTasks": 185,
    "standardTime": 7600,
    "actualTimeSpent": 8200
  },
  "notes": "Monthly performance summary"
}
```

## Database Schema Changes

### New Fields Added to AgentMetric Table

#### Calculated Metrics (Percentages)
- `scheduleAdherence` (Float)
- `attendanceRate` (Float)
- `punctualityScore` (Float)
- `breakCompliance` (Float)
- `taskCompletionRate` (Float)
- `productivityIndex` (Float)
- `qualityScore` (Float)
- `efficiencyRate` (Float)

#### Raw Data Fields
- `scheduledHours` (Float)
- `actualHours` (Float)
- `scheduledDays` (Int)
- `daysPresent` (Int)
- `totalShifts` (Int)
- `onTimeArrivals` (Int)
- `totalBreaks` (Int)
- `breaksWithinLimit` (Int)
- `tasksAssigned` (Int)
- `tasksCompleted` (Int)
- `expectedOutput` (Float)
- `actualOutput` (Float)
- `totalTasks` (Int)
- `errorFreeTasks` (Int)
- `standardTime` (Float)
- `actualTimeSpent` (Float)

#### New Weights
- `scheduleAdherenceWeight` (Float, default: 1.0)
- `attendanceRateWeight` (Float, default: 0.5)
- `punctualityScoreWeight` (Float, default: 0.5)
- `breakComplianceWeight` (Float, default: 0.5)
- `taskCompletionRateWeight` (Float, default: 1.5)
- `productivityIndexWeight` (Float, default: 1.5)
- `qualityScoreWeight` (Float, default: 1.5)
- `efficiencyRateWeight` (Float, default: 1.0)

## Migration and Backward Compatibility

### Legacy Support
The system maintains backward compatibility with existing 1-5 scale data:
- Legacy fields (`service`, `productivity`, `quality`, etc.) are preserved
- Old API endpoints continue to work
- Existing data is not lost during migration

### Migration Steps
1. **Database Migration**: Run `npx prisma migrate dev --name update_scorecard_structure`
2. **Seed New Data**: Run `npm run seed:new-scorecard` for sample data
3. **Import Historical Data**: Use the Excel import API for real data

## Calculation Examples

### Example 1: Schedule Adherence
- Scheduled Hours: 40 hours/week
- Actual Hours: 38.5 hours/week
- **Calculation**: (38.5 / 40) × 100 = 96.25%

### Example 2: Task Completion Rate
- Tasks Assigned: 50
- Tasks Completed: 47
- **Calculation**: (47 / 50) × 100 = 94%

### Example 3: Quality Score
- Total Tasks: 47
- Error-Free Tasks: 45
- **Calculation**: (45 / 47) × 100 = 95.74%

### Example 4: Overall Score Calculation
With the new weighting system:
- Schedule Adherence: 96.25% × 1.0 = 96.25
- Attendance Rate: 95% × 0.5 = 47.5
- Punctuality Score: 90% × 0.5 = 45
- Break Compliance: 92% × 0.5 = 46
- Task Completion Rate: 94% × 1.5 = 141
- Productivity Index: 98% × 1.5 = 147
- Quality Score: 95.74% × 1.5 = 143.61
- Efficiency Rate: 88% × 1.0 = 88

**Total Weighted Score**: 754.36
**Total Weight**: 8.0
**Final Score**: 754.36 / 8.0 = 94.3%

## Benefits of the New System

### 1. Objectivity
- Eliminates subjective scoring
- Based on measurable data points
- Consistent across all evaluators

### 2. Transparency
- Clear formulas for all calculations
- Raw data visible for verification
- Audit trail for all metrics

### 3. Actionability
- Specific areas for improvement identified
- Clear targets for each metric
- Data-driven coaching opportunities

### 4. Flexibility
- Customizable weights for different roles
- Easy to add new metrics
- Adaptable to business changes

### 5. Integration Ready
- Excel import/export capabilities
- API-first design
- Compatible with existing HR systems

## Implementation Timeline

### Phase 1: Core System (Completed)
- ✅ Database schema updates
- ✅ API endpoint modifications
- ✅ Calculation engine implementation
- ✅ Excel import functionality

### Phase 2: Frontend Updates (In Progress)
- 🔄 Scorecard display components
- 🔄 New metric visualizations
- 🔄 Import interface

### Phase 3: Training and Rollout (Pending)
- 📋 User training materials
- 📋 Manager guidelines
- 📋 Excel template distribution

## Support and Troubleshooting

### Common Issues

#### Import Errors
- **Issue**: "Employee not found"
- **Solution**: Ensure `employeeId` matches the system records

#### Calculation Discrepancies
- **Issue**: Unexpected metric values
- **Solution**: Verify raw data accuracy and formula understanding

#### Performance Impact
- **Issue**: Slow scorecard loading
- **Solution**: Data is aggregated monthly; large datasets may require optimization

### Getting Help
- Technical issues: Contact system administrator
- Formula questions: Refer to this documentation
- Training needs: Schedule session with HR team

## Conclusion

The new scorecard system provides a robust, transparent, and actionable framework for performance evaluation. By moving to objective, data-driven metrics, organizations can make more informed decisions about employee development and recognition.

The system's flexibility allows for customization while maintaining consistency and fairness across all evaluations. Regular monitoring and adjustment of weights and targets will ensure the system continues to meet organizational needs.