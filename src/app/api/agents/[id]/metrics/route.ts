import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import { cached, cacheKeys, invalidateCache } from "@/lib/cache";
import { rateLimiter, securityHeaders, logError } from "@/lib/security";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimiter.isAllowed(`agent-metrics:${clientIp}`)) {
      return NextResponse.json(
        { error: "Too many requests" }, 
        { status: 429, headers: securityHeaders }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401, headers: securityHeaders }
      );
    }

    // Only team leaders, managers, and admins can view agent metrics
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" }, 
        { status: 403, headers: securityHeaders }
      );
    }

    // Use cached data if available
    const metrics = await cached(
      cacheKeys.agentMetrics(params.id),
      async () => {
        return await prisma.agentMetric.findMany({
          where: {
            agentId: params.id
          },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 6
        });
      },
      60 * 1000 // 1 minute cache
    );

    if (metrics.length === 0) {
      return NextResponse.json({
        overallScore: 0,
        currentMetrics: {},
        historicalScores: [],
        sessionCount: 0,
        averageScore: 0,
        improvement: 0
      }, { headers: securityHeaders });
    }

    // Get the most recent metric
    const currentMetric = metrics[0];
    
    // Calculate overall score from the most recent metric
    const overallScore = currentMetric.percentage || 0;

    // Create current metrics object with normalized names
    const currentMetrics = {
      communication_skills: (currentMetric.service / 5) * 100,
      problem_resolution: (currentMetric.performance / 5) * 100,
      customer_service: (currentMetric.service / 5) * 100,
      process_adherence: (currentMetric.adherence / 5) * 100,
      product_knowledge: (currentMetric.quality / 5) * 100,
      call_handling: (currentMetric.productivity / 5) * 100,
      customer_satisfaction: (currentMetric.quality / 5) * 100,
      resolution_rate: (currentMetric.performance / 5) * 100
    };

    // Create historical scores array
    const historicalScores = metrics.map(metric => ({
      date: new Date(metric.year, metric.month - 1).toISOString(),
      score: metric.percentage || 0
    }));

    // Calculate additional metrics for the PerformanceData interface
    const sessionCount = metrics.length; // Number of months with data
    const averageScore = metrics.length > 0 ? 
      metrics.reduce((sum, metric) => sum + (metric.percentage || 0), 0) / metrics.length : 0;
    
    // Calculate improvement (compare first and last metrics)
    const improvement = metrics.length >= 2 ? 
      (metrics[0].percentage || 0) - (metrics[metrics.length - 1].percentage || 0) : 0;

    return NextResponse.json({
      overallScore,
      currentMetrics,
      historicalScores,
      sessionCount,
      averageScore: Number(averageScore.toFixed(2)),
      improvement: Number(improvement.toFixed(2))
    }, { headers: securityHeaders });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching agent metrics:", error);
    }
    return NextResponse.json(
      { error: "Failed to fetch agent metrics" },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimiter.isAllowed(`agent-metrics-post:${clientIp}`)) {
      return NextResponse.json(
        { error: "Too many requests" }, 
        { status: 429, headers: securityHeaders }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401, headers: securityHeaders }
      );
    }

    // Only team leaders, managers, and admins can create/update agent metrics
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" }, 
        { status: 403, headers: securityHeaders }
      );
    }

    const body = await request.json();
    const { metrics, month, year } = body;

    if (!metrics || !month || !year) {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400, headers: securityHeaders }
      );
    }

    // Convert percentage metrics back to 1-5 scale for database storage
    const convertToScale = (percentage: number) => Math.round((percentage / 100) * 5) || 1;

    // Create or update the agent metric
    const agentMetric = await prisma.agentMetric.upsert({
      where: {
        agentId_month_year: {
          agentId: params.id,
          month: month,
          year: year
        }
      },
      update: {
        service: convertToScale(metrics.communication_skills || metrics.customer_service || 0),
        productivity: convertToScale(metrics.call_handling || 0),
        quality: convertToScale(metrics.product_knowledge || metrics.customer_satisfaction || 0),
        assiduity: convertToScale(metrics.resolution_rate || 0),
        performance: convertToScale(metrics.problem_resolution || 0),
        adherence: convertToScale(metrics.process_adherence || 0),
        lateness: 3, // Default values for metrics not provided
        breakExceeds: 3,
        updatedAt: new Date()
      },
      create: {
        agentId: params.id,
        month: month,
        year: year,
        service: convertToScale(metrics.communication_skills || metrics.customer_service || 0),
        productivity: convertToScale(metrics.call_handling || 0),
        quality: convertToScale(metrics.product_knowledge || metrics.customer_satisfaction || 0),
        assiduity: convertToScale(metrics.resolution_rate || 0),
        performance: convertToScale(metrics.problem_resolution || 0),
        adherence: convertToScale(metrics.process_adherence || 0),
        lateness: 3,
        breakExceeds: 3
      }
    });

    // Calculate the percentage score
    const totalScore = agentMetric.service + agentMetric.productivity + agentMetric.quality + 
                      agentMetric.assiduity + agentMetric.performance + agentMetric.adherence +
                      agentMetric.lateness + agentMetric.breakExceeds;
    const maxScore = 8 * 5; // 8 metrics, max 5 each
    const percentage = (totalScore / maxScore) * 100;

    // Update with calculated values
    const updatedMetric = await prisma.agentMetric.update({
      where: { id: agentMetric.id },
      data: {
        totalScore: totalScore,
        percentage: Number(percentage.toFixed(2))
      }
    });

    // Invalidate related cache entries
    invalidateCache([
      cacheKeys.agentMetrics(params.id),
      cacheKeys.agents(),
      cacheKeys.agentById(params.id)
    ]);

    return NextResponse.json({
      success: true,
      metric: updatedMetric
    }, { headers: securityHeaders });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error saving agent metrics:", error);
    }
    return NextResponse.json(
      { error: "Failed to save agent metrics" },
      { status: 500, headers: securityHeaders }
    );
  }
}