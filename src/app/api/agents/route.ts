import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only team leaders, managers, and admins can view all agents
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agents = await prisma.user.findMany({
      where: {
        role: UserRole.AGENT
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        agentProfile: {
          select: {
            employeeId: true
          }
        },
        agentMetrics: {
          select: {
            percentage: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 6 // Last 6 months of data
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to flatten the structure and calculate average scores
    const transformedAgents = agents.map(agent => {
      const metrics = agent.agentMetrics || [];
      const averageScore = metrics.length > 0 
        ? Number((metrics.reduce((sum, metric) => sum + (metric.percentage || 0), 0) / metrics.length).toFixed(1))
        : 0;

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        employeeId: agent.agentProfile?.employeeId || '',
        createdAt: agent.createdAt,
        averageScore,
        metricsCount: metrics.length
      };
    });

    return NextResponse.json(transformedAgents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}