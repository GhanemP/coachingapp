import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { hasPermission } from '@/lib/rbac';
import { UserRole } from '@/lib/constants';

// GET /api/agents/[id]/scorecard - Get agent's scorecard metrics
export async function GET(
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
    const canViewScorecards = await hasPermission(session.user.role as UserRole, 'VIEW_SCORECARDS');
    if (!canViewScorecards) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;

    // Get agent details
    const agentData = await prisma.agent.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check access permissions based on role hierarchy
    if (session.user.role === 'AGENT' && agentData.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user.role === 'TEAM_LEADER') {
      const teamLeader = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { agents: true }
      });

      const isTeamMember = teamLeader?.agents.some(a => a.id === id);
      if (!isTeamMember && agentData.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build query conditions
    const whereConditions: Prisma.AgentMetricWhereInput = {
      agentId: id,
      year,
    };

    if (month) {
      whereConditions.month = month;
    }

    // Get metrics
    const metrics = await prisma.agentMetric.findMany({
      where: whereConditions,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    // Calculate trends (compare with previous period)
    const trends: Record<string, number> = {};
    if (metrics.length > 0 && month) {
      const previousMonth = month === 1 ? 12 : month - 1;
      const previousYear = month === 1 ? year - 1 : year;
      
      const previousMetric = await prisma.agentMetric.findUnique({
        where: {
          agentId_month_year: {
            agentId: id,
            month: previousMonth,
            year: previousYear,
          },
        },
      });

      if (previousMetric && metrics[0]) {
        const currentMetric = metrics[0];
        trends.service = currentMetric.service - previousMetric.service;
        trends.productivity = currentMetric.productivity - previousMetric.productivity;
        trends.quality = currentMetric.quality - previousMetric.quality;
        trends.assiduity = currentMetric.assiduity - previousMetric.assiduity;
        trends.performance = currentMetric.performance - previousMetric.performance;
        trends.adherence = currentMetric.adherence - previousMetric.adherence;
        trends.lateness = currentMetric.lateness - previousMetric.lateness;
        trends.breakExceeds = currentMetric.breakExceeds - previousMetric.breakExceeds;
        trends.totalScore = (currentMetric.totalScore || 0) - (previousMetric.totalScore || 0);
        trends.percentage = (currentMetric.percentage || 0) - (previousMetric.percentage || 0);
      }
    }

    // Calculate yearly average if no specific month is requested
    let yearlyAverage = null;
    if (!month && metrics.length > 0) {
      const avgMetrics = {
        service: 0,
        productivity: 0,
        quality: 0,
        assiduity: 0,
        performance: 0,
        adherence: 0,
        lateness: 0,
        breakExceeds: 0,
        totalScore: 0,
        percentage: 0,
      };

      metrics.forEach((metric) => {
        avgMetrics.service += metric.service;
        avgMetrics.productivity += metric.productivity;
        avgMetrics.quality += metric.quality;
        avgMetrics.assiduity += metric.assiduity;
        avgMetrics.performance += metric.performance;
        avgMetrics.adherence += metric.adherence;
        avgMetrics.lateness += metric.lateness;
        avgMetrics.breakExceeds += metric.breakExceeds;
        avgMetrics.totalScore += metric.totalScore || 0;
        avgMetrics.percentage += metric.percentage || 0;
      });

      const count = metrics.length;
      yearlyAverage = {
        service: Math.round((avgMetrics.service / count) * 100) / 100,
        productivity: Math.round((avgMetrics.productivity / count) * 100) / 100,
        quality: Math.round((avgMetrics.quality / count) * 100) / 100,
        assiduity: Math.round((avgMetrics.assiduity / count) * 100) / 100,
        performance: Math.round((avgMetrics.performance / count) * 100) / 100,
        adherence: Math.round((avgMetrics.adherence / count) * 100) / 100,
        lateness: Math.round((avgMetrics.lateness / count) * 100) / 100,
        breakExceeds: Math.round((avgMetrics.breakExceeds / count) * 100) / 100,
        totalScore: Math.round((avgMetrics.totalScore / count) * 100) / 100,
        percentage: Math.round((avgMetrics.percentage / count) * 100) / 100,
      };
    }

    return NextResponse.json({
      agent: agentData,
      metrics,
      trends,
      yearlyAverage,
      year,
      month,
    });
  } catch (error) {
    console.error('Error fetching agent scorecard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scorecard' },
      { status: 500 }
    );
  }
}

// POST /api/agents/[id]/scorecard - Create or update agent metrics
export async function POST(
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
    if (session.user.role !== 'TEAM_LEADER' && session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { month, year, metrics, weights, notes } = body;

    // Validate input
    if (!month || !year || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total score and percentage
    const defaultWeights = {
      serviceWeight: 1.0,
      productivityWeight: 1.0,
      qualityWeight: 1.0,
      assiduityWeight: 1.0,
      performanceWeight: 1.0,
      adherenceWeight: 1.0,
      latenessWeight: 1.0,
      breakExceedsWeight: 1.0,
    };

    const finalWeights = { ...defaultWeights, ...weights };
    
    const totalScore =
      metrics.service * finalWeights.serviceWeight +
      metrics.productivity * finalWeights.productivityWeight +
      metrics.quality * finalWeights.qualityWeight +
      metrics.assiduity * finalWeights.assiduityWeight +
      metrics.performance * finalWeights.performanceWeight +
      metrics.adherence * finalWeights.adherenceWeight +
      metrics.lateness * finalWeights.latenessWeight +
      metrics.breakExceeds * finalWeights.breakExceedsWeight;

    const maxPossibleScore =
      5 * (finalWeights.serviceWeight + finalWeights.productivityWeight + finalWeights.qualityWeight +
           finalWeights.assiduityWeight + finalWeights.performanceWeight + finalWeights.adherenceWeight +
           finalWeights.latenessWeight + finalWeights.breakExceedsWeight);

    const percentage = (totalScore / maxPossibleScore) * 100;

    // Create or update metric
    const metric = await prisma.agentMetric.upsert({
      where: {
        agentId_month_year: {
          agentId: id,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        ...metrics,
        ...finalWeights,
        totalScore,
        percentage,
        notes,
        updatedAt: new Date(),
      },
      create: {
        agentId: id,
        month: parseInt(month),
        year: parseInt(year),
        ...metrics,
        ...finalWeights,
        totalScore,
        percentage,
        notes,
      },
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error('Error creating/updating agent metrics:', error);
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id]/scorecard - Delete agent metrics
export async function DELETE(
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
    if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    await prisma.agentMetric.delete({
      where: {
        agentId_month_year: {
          agentId: id,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });

    return NextResponse.json({ message: 'Metrics deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent metrics:', error);
    return NextResponse.json(
      { error: 'Failed to delete metrics' },
      { status: 500 }
    );
  }
}