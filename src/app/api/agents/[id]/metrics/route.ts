import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { cached, cacheKeys, invalidateCache } from '@/lib/cache';
import {
  metricToPercentage,
  percentageToMetric,
  calculateTotalScore,
  roundToDecimals,
  calculateAverage,
} from '@/lib/calculation-utils';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { rateLimiter, securityHeaders } from '@/lib/security';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimiter.isAllowed(`agent-metrics:${clientIp}`)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: securityHeaders }
      );
    }

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Check access permissions based on role hierarchy
    if (session.user.role === 'AGENT' && params.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: securityHeaders });
    }

    if (session.user.role === 'TEAM_LEADER') {
      const teamLeader = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { agents: true },
      });

      const isTeamMember = teamLeader?.agents.some(a => a.id === params.id);
      if (!isTeamMember && params.id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: securityHeaders });
      }
    }

    // Managers and Admins can access all metrics
    const allowedRoles: UserRole[] = [UserRole.MANAGER, UserRole.ADMIN];
    if (
      !allowedRoles.includes(session.user.role as UserRole) &&
      session.user.role !== 'TEAM_LEADER' &&
      session.user.role !== 'AGENT'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: securityHeaders });
    }

    // Use cached data if available
    const metrics = await cached(
      cacheKeys.agentMetrics(params.id),
      async () => {
        return await prisma.agentMetric.findMany({
          where: {
            agentId: params.id,
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
        });
      },
      60 * 1000 // 1 minute cache
    );

    if (metrics.length === 0) {
      return NextResponse.json(
        {
          overallScore: 0,
          currentMetrics: {},
          historicalScores: [],
          sessionCount: 0,
          averageScore: 0,
          improvement: 0,
        },
        { headers: securityHeaders }
      );
    }

    // Get the most recent metric
    const currentMetric = metrics[0];

    // Calculate overall score from the most recent metric
    const overallScore = currentMetric.percentage || 0;

    // Create current metrics object with normalized names using proper conversion
    // Handle nullable legacy fields by providing defaults
    const currentMetrics = {
      communication_skills: metricToPercentage(currentMetric.service || 3),
      problem_resolution: metricToPercentage(currentMetric.performance || 3),
      customer_service: metricToPercentage(currentMetric.service || 3),
      process_adherence: metricToPercentage(currentMetric.adherence || 3),
      product_knowledge: metricToPercentage(currentMetric.quality || 3),
      call_handling: metricToPercentage(currentMetric.productivity || 3),
      customer_satisfaction: metricToPercentage(currentMetric.quality || 3),
      resolution_rate: metricToPercentage(currentMetric.performance || 3),
    };

    // Create historical scores array
    const historicalScores = metrics.map(metric => ({
      date: new Date(metric.year, metric.month - 1).toISOString(),
      score: metric.percentage || 0,
    }));

    // Calculate additional metrics for the PerformanceData interface
    const sessionCount = metrics.length; // Number of months with data
    const percentages = metrics.map(m => m.percentage || 0);
    const averageScore = calculateAverage(percentages, 2);

    // Calculate improvement (compare first and last metrics)
    const improvement =
      metrics.length >= 2
        ? roundToDecimals(
            (metrics[0]?.percentage || 0) - (metrics[metrics.length - 1].percentage || 0),
            2
          )
        : 0;

    return NextResponse.json(
      {
        overallScore,
        currentMetrics,
        historicalScores,
        sessionCount,
        averageScore,
        improvement,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      logger.error('Error fetching agent metrics:', error as Error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch agent metrics' },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimiter.isAllowed(`agent-metrics-post:${clientIp}`)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: securityHeaders }
      );
    }

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Check access permissions based on role hierarchy
    if (session.user.role === 'AGENT' && params.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: securityHeaders });
    }

    if (session.user.role === 'TEAM_LEADER') {
      const teamLeader = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { agents: true },
      });

      const isTeamMember = teamLeader?.agents.some(a => a.id === params.id);
      if (!isTeamMember && params.id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: securityHeaders });
      }
    }

    // Managers and Admins can update all metrics
    const allowedRoles: UserRole[] = [UserRole.MANAGER, UserRole.ADMIN];
    if (
      !allowedRoles.includes(session.user.role as UserRole) &&
      session.user.role !== 'TEAM_LEADER' &&
      session.user.role !== 'AGENT'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: securityHeaders });
    }

    const body = await request.json();
    const { metrics, month, year } = body;

    if (!metrics || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Convert percentage metrics back to 1-5 scale for database storage
    const validatedMetrics = {
      service: percentageToMetric(metrics.communication_skills || metrics.customer_service || 0),
      productivity: percentageToMetric(metrics.call_handling || 0),
      quality: percentageToMetric(metrics.product_knowledge || metrics.customer_satisfaction || 0),
      assiduity: percentageToMetric(metrics.resolution_rate || 0),
      performance: percentageToMetric(metrics.problem_resolution || 0),
      adherence: percentageToMetric(metrics.process_adherence || 0),
      lateness: 3, // Default values for metrics not provided
      breakExceeds: 3,
    };

    // Calculate total score and percentage using utility
    const metricsArray = [
      { score: validatedMetrics.service, weight: 1 },
      { score: validatedMetrics.productivity, weight: 1 },
      { score: validatedMetrics.quality, weight: 1 },
      { score: validatedMetrics.assiduity, weight: 1 },
      { score: validatedMetrics.performance, weight: 1 },
      { score: validatedMetrics.adherence, weight: 1 },
      { score: validatedMetrics.lateness, weight: 1 },
      { score: validatedMetrics.breakExceeds, weight: 1 },
    ];

    const { totalScore, percentage } = calculateTotalScore(metricsArray);

    // Create or update the agent metric
    const agentMetric = await prisma.agentMetric.upsert({
      where: {
        agentId_month_year: {
          agentId: params.id,
          month: month,
          year: year,
        },
      },
      update: {
        ...validatedMetrics,
        totalScore: roundToDecimals(totalScore, 2),
        percentage: roundToDecimals(percentage, 2),
        updatedAt: new Date(),
      },
      create: {
        agentId: params.id,
        month: month,
        year: year,
        ...validatedMetrics,

        // New scorecard metrics (provide defaults)
        scheduleAdherence: 85,
        attendanceRate: 90,
        punctualityScore: 85,
        breakCompliance: 90,
        taskCompletionRate: 85,
        productivityIndex: 90,
        qualityScore: 88,
        efficiencyRate: 85,

        // Raw data fields (provide defaults)
        scheduledHours: 160,
        actualHours: 155,
        scheduledDays: 20,
        daysPresent: 19,
        totalShifts: 20,
        onTimeArrivals: 17,
        totalBreaks: 40,
        breaksWithinLimit: 36,
        tasksAssigned: 200,
        tasksCompleted: 180,
        expectedOutput: 16000,
        actualOutput: 15200,
        totalTasks: 180,
        errorFreeTasks: 170,
        standardTime: 7200,
        actualTimeSpent: 8000,

        // New weights
        scheduleAdherenceWeight: 1.0,
        attendanceRateWeight: 0.5,
        punctualityScoreWeight: 0.5,
        breakComplianceWeight: 0.5,
        taskCompletionRateWeight: 1.5,
        productivityIndexWeight: 1.5,
        qualityScoreWeight: 1.5,
        efficiencyRateWeight: 1.0,

        totalScore: roundToDecimals(totalScore, 2),
        percentage: roundToDecimals(percentage, 2),
      },
    });

    // Invalidate related cache entries
    invalidateCache([
      cacheKeys.agentMetrics(params.id),
      cacheKeys.agents(),
      cacheKeys.agentById(params.id),
    ]);

    return NextResponse.json(
      {
        success: true,
        metric: agentMetric,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      logger.error('Error saving agent metrics:', error as Error);
    }
    return NextResponse.json(
      { error: 'Failed to save agent metrics' },
      { status: 500, headers: securityHeaders }
    );
  }
}
