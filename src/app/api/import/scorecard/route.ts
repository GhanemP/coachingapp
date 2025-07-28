import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import {
  calculateNewScorecardMetrics,
  calculateNewScorecardTotalScore,
  NEW_SCORECARD_WEIGHTS,
  roundToDecimals,
} from '@/lib/calculation-utils';
// import { UserRole } from '@/lib/constants'; // Unused import
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
// import { hasPermission } from '@/lib/rbac'; // Unused import

interface ExcelRowData {
  employeeId: string;
  employeeName: string;
  date: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualClockIn: string;
  actualClockOut: string;
  scheduledBreakStart: string;
  scheduledBreakEnd: string;
  actualBreakStart: string;
  actualBreakEnd: string;
  tasksAssigned: number;
  tasksCompleted: number;
  errorsCount: number;
  outputUnits: number;
  expectedOutput: number;
  timePerTask: number;
  standardTimePerTask: number;
}

// POST /api/import/scorecard - Import scorecard data from Excel
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (managers and admins only)
    if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { data, month, year } = body;

    if (!data || !Array.isArray(data) || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: data, month, year' },
        { status: 400 }
      );
    }

    const results: Array<{
      employeeId: string;
      employeeName: string;
      agentId: string;
      status: string;
      metricId: string;
    }> = [];
    const errors: string[] = [];

    // Process all rows in parallel for better performance
    const processPromises = (data as ExcelRowData[]).map(async row => {
      try {
        // Find agent by employee ID
        const agent = await prisma.user.findFirst({
          where: {
            role: 'AGENT',
            agentProfile: {
              employeeId: row.employeeId,
            },
          },
          include: {
            agentProfile: true,
          },
        });

        if (!agent) {
          return { error: `Agent not found for employee ID: ${row.employeeId}` };
        }

        // Calculate hours worked
        const scheduledStart = new Date(`${row.date} ${row.scheduledStartTime}`);
        const scheduledEnd = new Date(`${row.date} ${row.scheduledEndTime}`);
        const actualStart = new Date(`${row.date} ${row.actualClockIn}`);
        const actualEnd = new Date(`${row.date} ${row.actualClockOut}`);

        const scheduledHours =
          (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60 * 60);
        const actualHours = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60);

        // Calculate break compliance
        const scheduledBreakStart = new Date(`${row.date} ${row.scheduledBreakStart}`);
        const scheduledBreakEnd = new Date(`${row.date} ${row.scheduledBreakEnd}`);
        const actualBreakStart = new Date(`${row.date} ${row.actualBreakStart}`);
        const actualBreakEnd = new Date(`${row.date} ${row.actualBreakEnd}`);

        const scheduledBreakDuration =
          (scheduledBreakEnd.getTime() - scheduledBreakStart.getTime()) / (1000 * 60);
        const actualBreakDuration =
          (actualBreakEnd.getTime() - actualBreakStart.getTime()) / (1000 * 60);
        const breakWithinLimit = actualBreakDuration <= scheduledBreakDuration ? 1 : 0;

        // Check punctuality (on time if within 5 minutes)
        const onTime =
          Math.abs(actualStart.getTime() - scheduledStart.getTime()) <= 5 * 60 * 1000 ? 1 : 0;

        // Calculate error-free tasks
        const errorFreeTasks = Math.max(0, row.tasksCompleted - row.errorsCount);

        // Prepare raw data for calculation
        const rawData = {
          scheduledHours,
          actualHours,
          scheduledDays: 1, // Single day entry
          daysPresent: 1, // Present if data exists
          totalShifts: 1,
          onTimeArrivals: onTime,
          totalBreaks: 1,
          breaksWithinLimit: breakWithinLimit,
          tasksAssigned: row.tasksAssigned,
          tasksCompleted: row.tasksCompleted,
          expectedOutput: row.expectedOutput,
          actualOutput: row.outputUnits,
          totalTasks: row.tasksCompleted,
          errorFreeTasks,
          standardTime: row.standardTimePerTask * row.tasksCompleted,
          actualTimeSpent: row.timePerTask * row.tasksCompleted,
        };

        // Calculate metrics
        const calculatedMetrics = calculateNewScorecardMetrics(rawData);
        const { totalScore, percentage } = calculateNewScorecardTotalScore(calculatedMetrics);

        // Check if record already exists for this month/year
        const existingMetric = await prisma.agentMetric.findUnique({
          where: {
            agentId_month_year: {
              agentId: agent.id,
              month: parseInt(month),
              year: parseInt(year),
            },
          },
        });

        let metric;
        if (existingMetric) {
          // Update existing record by aggregating data
          const updatedRawData = {
            scheduledHours: (existingMetric.scheduledHours || 0) + scheduledHours,
            actualHours: (existingMetric.actualHours || 0) + actualHours,
            scheduledDays: (existingMetric.scheduledDays || 0) + 1,
            daysPresent: (existingMetric.daysPresent || 0) + 1,
            totalShifts: (existingMetric.totalShifts || 0) + 1,
            onTimeArrivals: (existingMetric.onTimeArrivals || 0) + onTime,
            totalBreaks: (existingMetric.totalBreaks || 0) + 1,
            breaksWithinLimit: (existingMetric.breaksWithinLimit || 0) + breakWithinLimit,
            tasksAssigned: (existingMetric.tasksAssigned || 0) + row.tasksAssigned,
            tasksCompleted: (existingMetric.tasksCompleted || 0) + row.tasksCompleted,
            expectedOutput: (existingMetric.expectedOutput || 0) + row.expectedOutput,
            actualOutput: (existingMetric.actualOutput || 0) + row.outputUnits,
            totalTasks: (existingMetric.totalTasks || 0) + row.tasksCompleted,
            errorFreeTasks: (existingMetric.errorFreeTasks || 0) + errorFreeTasks,
            standardTime:
              (existingMetric.standardTime || 0) + row.standardTimePerTask * row.tasksCompleted,
            actualTimeSpent:
              (existingMetric.actualTimeSpent || 0) + row.timePerTask * row.tasksCompleted,
          };

          const updatedMetrics = calculateNewScorecardMetrics(updatedRawData);
          const updatedScore = calculateNewScorecardTotalScore(updatedMetrics);

          metric = await prisma.agentMetric.update({
            where: {
              agentId_month_year: {
                agentId: agent.id,
                month: parseInt(month),
                year: parseInt(year),
              },
            },
            data: {
              ...updatedMetrics,
              ...updatedRawData,
              scheduleAdherenceWeight: NEW_SCORECARD_WEIGHTS.scheduleAdherenceWeight,
              attendanceRateWeight: NEW_SCORECARD_WEIGHTS.attendanceRateWeight,
              punctualityScoreWeight: NEW_SCORECARD_WEIGHTS.punctualityScoreWeight,
              breakComplianceWeight: NEW_SCORECARD_WEIGHTS.breakComplianceWeight,
              taskCompletionRateWeight: NEW_SCORECARD_WEIGHTS.taskCompletionRateWeight,
              productivityIndexWeight: NEW_SCORECARD_WEIGHTS.productivityIndexWeight,
              qualityScoreWeight: NEW_SCORECARD_WEIGHTS.qualityScoreWeight,
              efficiencyRateWeight: NEW_SCORECARD_WEIGHTS.efficiencyRateWeight,
              totalScore: roundToDecimals(updatedScore.totalScore, 2),
              percentage: roundToDecimals(updatedScore.percentage, 2),
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new record
          metric = await prisma.agentMetric.create({
            data: {
              agentId: agent.id,
              month: parseInt(month),
              year: parseInt(year),
              ...calculatedMetrics,
              ...rawData,
              scheduleAdherenceWeight: NEW_SCORECARD_WEIGHTS.scheduleAdherenceWeight,
              attendanceRateWeight: NEW_SCORECARD_WEIGHTS.attendanceRateWeight,
              punctualityScoreWeight: NEW_SCORECARD_WEIGHTS.punctualityScoreWeight,
              breakComplianceWeight: NEW_SCORECARD_WEIGHTS.breakComplianceWeight,
              taskCompletionRateWeight: NEW_SCORECARD_WEIGHTS.taskCompletionRateWeight,
              productivityIndexWeight: NEW_SCORECARD_WEIGHTS.productivityIndexWeight,
              qualityScoreWeight: NEW_SCORECARD_WEIGHTS.qualityScoreWeight,
              efficiencyRateWeight: NEW_SCORECARD_WEIGHTS.efficiencyRateWeight,
              totalScore: roundToDecimals(totalScore, 2),
              percentage: roundToDecimals(percentage, 2),
            },
          });
        }

        return {
          success: {
            employeeId: row.employeeId,
            employeeName: row.employeeName,
            agentId: agent.id,
            status: 'success',
            metricId: metric.id,
          },
        };
      } catch (error) {
        logger.error(`Error processing row for employee ${row.employeeId}:`, error as Error);
        return {
          error: `Error processing employee ${row.employeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    });

    // Wait for all processing to complete
    const processResults = await Promise.all(processPromises);

    // Separate successful results from errors
    processResults.forEach(result => {
      if ('error' in result && result.error) {
        errors.push(result.error);
      } else if ('success' in result && result.success) {
        results.push(result.success);
      }
    });

    return NextResponse.json({
      message: 'Import completed',
      results,
      errors,
      summary: {
        total: data.length,
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    logger.error('Error importing scorecard data:', error as Error);
    return NextResponse.json({ error: 'Failed to import scorecard data' }, { status: 500 });
  }
}
