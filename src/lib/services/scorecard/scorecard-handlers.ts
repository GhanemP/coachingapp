import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { UserRole } from '@/lib/constants';

import { ScorecardCalculations } from './scorecard-calculations';
import { ScorecardService } from './scorecard-service';

/**
 * Handler for GET /api/agents/[id]/scorecard
 */
export async function handleGetScorecard(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions for viewing scorecards
    const canViewScorecards = await ScorecardService.checkViewPermission(
      session.user.role as UserRole
    );
    if (!canViewScorecards) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!)
      : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;

    // Get agent details
    const agentData = await ScorecardService.getAgentData(id);

    // Check access permissions based on role hierarchy
    const hasAccess = await ScorecardService.checkAccessPermissions(
      { id: session.user.id, role: session.user.role as UserRole },
      id
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // PERFORMANCE OPTIMIZATION: Fix inefficient trend calculations
    // Use single optimized query to fetch current and previous metrics together
    let metrics,
      trends: Record<string, number> = {};

    if (month) {
      // Get current and previous month data in single query for trend calculation
      const previousMonth = month === 1 ? 12 : month - 1;
      const previousYear = month === 1 ? year - 1 : year;

      const [currentMetrics, previousMetrics] = await Promise.all([
        ScorecardService.getAgentMetrics(
          ScorecardService.buildQueryConditions(id, { year, month })
        ),
        ScorecardService.getAgentMetrics(
          ScorecardService.buildQueryConditions(id, { year: previousYear, month: previousMonth })
        ),
      ]);

      metrics = currentMetrics;

      // Calculate trends if both current and previous data exist
      if (currentMetrics.length > 0 && previousMetrics.length > 0) {
        trends = ScorecardCalculations.calculateTrends(
          currentMetrics[0] as unknown as Record<string, number>,
          previousMetrics[0] as unknown as Record<string, number>
        ) as unknown as Record<string, number>;
      }
    } else {
      // For yearly data, just get the metrics without trends
      const whereConditions = ScorecardService.buildQueryConditions(id, { year, month });
      metrics = await ScorecardService.getAgentMetrics(whereConditions);
    }

    // Calculate yearly average if no specific month is requested
    let yearlyAverage = null;
    if (!month && metrics.length > 0) {
      yearlyAverage = ScorecardCalculations.calculateYearlyAverage(
        metrics as unknown as Record<string, number>[]
      );
    }

    ScorecardService.logOperation('fetch', id, { year, month });

    return NextResponse.json({
      agent: agentData,
      metrics,
      trends,
      yearlyAverage,
      year,
      month,
    });
  } catch (error) {
    ScorecardService.logError('fetch', error as Error, (await context.params).id);
    return NextResponse.json({ error: 'Failed to fetch scorecard' }, { status: 500 });
  }
}

/**
 * Handler for POST /api/agents/[id]/scorecard
 */
export async function handleCreateScorecard(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (team leader or manager)
    if (!ScorecardService.checkModifyPermission(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { month, year, rawData, metrics, weights, notes } = body;

    // Validate input
    if (!month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: month and year' },
        { status: 400 }
      );
    }

    // Process metrics input and calculate scores
    const calculationResult = ScorecardCalculations.processMetricsInput(rawData, metrics, weights);

    // Prepare data for database
    const dbData = ScorecardCalculations.prepareDatabaseData(
      calculationResult,
      rawData,
      metrics,
      notes
    );

    // Create or update metric
    const metric = await ScorecardService.upsertAgentMetrics(
      id,
      { month: parseInt(month), year: parseInt(year), rawData, metrics, weights, notes },
      dbData
    );

    ScorecardService.logOperation('create/update', id, { month, year });

    return NextResponse.json(metric);
  } catch (error) {
    ScorecardService.logError('create/update', error as Error, (await context.params).id);
    return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 });
  }
}

/**
 * Handler for DELETE /api/agents/[id]/scorecard
 */
export async function handleDeleteScorecard(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (manager or admin only)
    if (!ScorecardService.checkDeletePermission(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    await ScorecardService.deleteAgentMetrics(id, {
      month: parseInt(month),
      year: parseInt(year),
    });

    ScorecardService.logOperation('delete', id, { month, year });

    return NextResponse.json({ message: 'Metrics deleted successfully' });
  } catch (error) {
    ScorecardService.logError('delete', error as Error, (await context.params).id);
    return NextResponse.json({ error: 'Failed to delete metrics' }, { status: 500 });
  }
}
