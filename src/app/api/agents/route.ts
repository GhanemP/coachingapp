import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import { cached, cacheKeys } from "@/lib/cache";
import { rateLimiter, logError, securityHeaders } from "@/lib/security";

export async function GET(request: Request) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimiter.isAllowed(`agents:${clientIp}`)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: securityHeaders }
      );
    }

    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: securityHeaders }
      );
    }

    // Only team leaders, managers, and admins can view all agents
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: securityHeaders }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const supervised = searchParams.get('supervised') === 'true';

    // Build where clause based on role and supervised parameter
    const baseWhereClause = {
      role: UserRole.AGENT,
      isActive: true,
    };

    let whereClause: typeof baseWhereClause & { id?: { in: string[] } } = baseWhereClause;

    // If supervised flag is set and user is a team leader, filter by their agents
    if (supervised && session.user.role === UserRole.TEAM_LEADER) {
      // Get the team leader's agents using the reverse relationship
      const teamLeader = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { agents: { select: { id: true } } }
      });
      
      const agentIds = teamLeader?.agents.map(a => a.id) || [];
      whereClause = {
        ...baseWhereClause,
        id: { in: agentIds }
      };
    }

    // Use cached data if available (include supervised flag in cache key)
    const cacheKey = supervised ? `${cacheKeys.agents()}-supervised-${session.user.id}` : cacheKeys.agents();
    const agents = await cached(
      cacheKey,
      async () => {
        return await prisma.user.findMany({
          where: whereClause,
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
      },
      2 * 60 * 1000 // 2 minutes cache
    );

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

    return NextResponse.json(transformedAgents, { headers: securityHeaders });
  } catch (error) {
    logError(error, 'agents-api-get');
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500, headers: securityHeaders }
    );
  }
}