import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only team leaders, managers, and admins can view agent metrics
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the agent's metrics for the last 6 months
    const metrics = await prisma.agentMetric.findMany({
      where: {
        agent: {
          userId: params.id
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      take: 6
    });

    if (metrics.length === 0) {
      return NextResponse.json({
        overallScore: 0,
        currentMetrics: {},
        historicalScores: []
      });
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

    return NextResponse.json({
      overallScore,
      currentMetrics,
      historicalScores
    });
  } catch (error) {
    console.error("Error fetching agent metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent metrics" },
      { status: 500 }
    );
  }
}