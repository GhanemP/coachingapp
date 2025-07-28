import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { roundToDecimals, calculateAverage } from '@/lib/calculation-utils';
import { UserRole, SessionStatus } from '@/lib/constants';
import logger from '@/lib/logger';
import { calculateOverallScore } from '@/lib/metrics';
import { QueryCache, withCache } from '@/lib/performance/query-cache';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    const userId = session.user.id;

    switch (userRole) {
      case UserRole.AGENT:
        return getAgentDashboard(userId);
      case UserRole.TEAM_LEADER:
        return getTeamLeaderDashboard(userId);
      case UserRole.MANAGER:
        return getManagerDashboard(userId);
      case UserRole.ADMIN:
        return getAdminDashboard();
      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error fetching dashboard data:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getAgentDashboard(agentId: string) {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    include: {
      agentProfile: true,
      teamLeader: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!agent || !agent.agentProfile) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Get current month metrics
  const currentMetrics = await prisma.performance.findMany({
    where: {
      agentId: agent.agentProfile.id,
      period: '2025-01',
    },
  });

  // Calculate overall score
  const metricsMap = currentMetrics.reduce((acc, metric) => {
    acc[metric.metricType] = metric.score;
    return acc;
  }, {} as Record<string, number>);

  const overallScore = calculateOverallScore(metricsMap);

  // Get upcoming sessions
  const upcomingSessions = await prisma.coachingSession.findMany({
    where: {
      agentId: agentId,
      status: SessionStatus.SCHEDULED,
      scheduledDate: {
        gte: new Date(),
      },
    },
    include: {
      teamLeader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 5,
  });

  // Get recent sessions
  const recentSessions = await prisma.coachingSession.findMany({
    where: {
      agentId: agentId,
      status: SessionStatus.COMPLETED,
    },
    include: {
      teamLeader: {
        select: {
          id: true,
          name: true,
        },
      },
      sessionMetrics: true,
    },
    orderBy: { sessionDate: 'desc' },
    take: 5,
  });

  return NextResponse.json({
    user: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      employeeId: agent.agentProfile.employeeId,
      department: agent.agentProfile.department,
      teamLeader: agent.teamLeader,
    },
    metrics: {
      current: metricsMap,
      overallScore,
    },
    upcomingSessions,
    recentSessions,
  });
}

async function getTeamLeaderDashboard(teamLeaderId: string) {
  // PERFORMANCE OPTIMIZATION: Add caching for dashboard data
  const cacheKey = QueryCache.generateDashboardKey(teamLeaderId, 'TEAM_LEADER');
  
  return await withCache(cacheKey, async () => {
    // PERFORMANCE OPTIMIZATION: Fix N+1 query problem with single optimized query
    // Use JOIN to fetch all data in one query instead of 1 + N queries
    const teamLeaderData = await prisma.user.findUnique({
      where: { id: teamLeaderId },
      include: {
        agents: {
          include: {
            agentProfile: true,
            // Use nested include to fetch performance data in single query
            agentMetrics: {
              where: {
                year: 2025,
                month: 1, // Current month
              },
              take: 1, // Only get current month's data
            },
          },
        },
      },
    });

  if (!teamLeaderData) {
    return NextResponse.json({ error: 'Team leader not found' }, { status: 404 });
  }

  // PERFORMANCE OPTIMIZATION: Process data in memory instead of additional queries
  // This eliminates the N+1 query problem completely
  const agentPerformance = teamLeaderData.agents
    .filter(agent => agent.agentProfile) // Filter out agents without profiles
    .map(agent => {
      if (!agent.agentProfile) {
        return null;
      }

      // Get current month's metrics (already fetched via JOIN)
      const currentMetrics = agent.agentMetrics[0];
      
      // Build metrics map from AgentMetric data
      const metricsMap: Record<string, number> = {};
      if (currentMetrics) {
        // New scorecard metrics (with null checks)
        if (currentMetrics.scheduleAdherence !== null) {
          metricsMap.scheduleAdherence = currentMetrics.scheduleAdherence;
        }
        if (currentMetrics.attendanceRate !== null) {
          metricsMap.attendanceRate = currentMetrics.attendanceRate;
        }
        if (currentMetrics.punctualityScore !== null) {
          metricsMap.punctualityScore = currentMetrics.punctualityScore;
        }
        if (currentMetrics.breakCompliance !== null) {
          metricsMap.breakCompliance = currentMetrics.breakCompliance;
        }
        if (currentMetrics.taskCompletionRate !== null) {
          metricsMap.taskCompletionRate = currentMetrics.taskCompletionRate;
        }
        if (currentMetrics.productivityIndex !== null) {
          metricsMap.productivityIndex = currentMetrics.productivityIndex;
        }
        if (currentMetrics.qualityScore !== null) {
          metricsMap.qualityScore = currentMetrics.qualityScore;
        }
        if (currentMetrics.efficiencyRate !== null) {
          metricsMap.efficiencyRate = currentMetrics.efficiencyRate;
        }
        
        // Legacy metrics (for backward compatibility)
        if (currentMetrics.service) {
          metricsMap.service = currentMetrics.service;
        }
        if (currentMetrics.productivity) {
          metricsMap.productivity = currentMetrics.productivity;
        }
        if (currentMetrics.quality) {
          metricsMap.quality = currentMetrics.quality;
        }
        if (currentMetrics.assiduity) {
          metricsMap.assiduity = currentMetrics.assiduity;
        }
        if (currentMetrics.performance) {
          metricsMap.performance = currentMetrics.performance;
        }
        if (currentMetrics.adherence) {
          metricsMap.adherence = currentMetrics.adherence;
        }
        if (currentMetrics.lateness) {
          metricsMap.lateness = currentMetrics.lateness;
        }
        if (currentMetrics.breakExceeds) {
          metricsMap.breakExceeds = currentMetrics.breakExceeds;
        }
      }

      const overallScore = calculateOverallScore(metricsMap);

      return {
        id: agent.id,
        name: agent.name || '',
        email: agent.email,
        employeeId: agent.agentProfile.employeeId,
        overallScore,
        metrics: metricsMap,
      };
    })
    .filter(agent => agent !== null); // Remove null entries

  // Get upcoming sessions
  const upcomingSessions = await prisma.coachingSession.findMany({
    where: {
      teamLeaderId: teamLeaderId,
      status: SessionStatus.SCHEDULED,
      scheduledDate: {
        gte: new Date(),
      },
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 10,
  });

  // Get team statistics
  const sessionStats = await prisma.coachingSession.groupBy({
    by: ['status'],
    where: {
      teamLeaderId: teamLeaderId,
    },
    _count: true,
  });

  const stats = {
    totalAgents: teamLeaderData.agents.length,
    scheduledSessions: sessionStats.find(s => s.status === SessionStatus.SCHEDULED)?._count || 0,
    completedSessions: sessionStats.find(s => s.status === SessionStatus.COMPLETED)?._count || 0,
    averageScore: roundToDecimals(
      calculateAverage(
        agentPerformance
          .filter(a => a !== null)
          .map(a => a?.overallScore || 0)
      ),
      2
    ),
  };

    return NextResponse.json({
      user: {
        id: teamLeaderData.id,
        name: teamLeaderData.name,
        email: teamLeaderData.email,
        role: teamLeaderData.role,
      },
      teamStats: stats,
      agents: agentPerformance.filter(a => a !== null),
      upcomingSessions,
    });
  }, 2 * 60 * 1000); // Cache for 2 minutes
}

async function getManagerDashboard(managerId: string) {
  // PERFORMANCE OPTIMIZATION: Fix nested Promise.all N+1 query problem
  // Use single optimized query with deep includes to fetch all data at once
  const managerData = await prisma.user.findUnique({
    where: { id: managerId },
    include: {
      managedUsers: {
        where: {
          role: 'TEAM_LEADER'
        },
        include: {
          agents: {
            include: {
              agentProfile: true,
              // Fetch current month's metrics for all agents in single query
              agentMetrics: {
                where: {
                  year: 2025,
                  month: 1, // Current month
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!managerData) {
    return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
  }

  // PERFORMANCE OPTIMIZATION: Process all data in memory instead of additional queries
  // This eliminates the exponential N+1 query problem completely
  const teamStats = managerData.managedUsers.map(teamLeader => {
    const agentScores: number[] = [];
    
    // Process agents for this team leader
    teamLeader.agents.forEach(agent => {
      if (!agent.agentProfile) {
        agentScores.push(0);
        return;
      }

      // Get current month's metrics (already fetched via JOIN)
      const currentMetrics = agent.agentMetrics[0];
      
      // Build metrics map from AgentMetric data
      const metricsMap: Record<string, number> = {};
      if (currentMetrics) {
        // New scorecard metrics (with null checks)
        if (currentMetrics.scheduleAdherence !== null) {
          metricsMap.scheduleAdherence = currentMetrics.scheduleAdherence;
        }
        if (currentMetrics.attendanceRate !== null) {
          metricsMap.attendanceRate = currentMetrics.attendanceRate;
        }
        if (currentMetrics.punctualityScore !== null) {
          metricsMap.punctualityScore = currentMetrics.punctualityScore;
        }
        if (currentMetrics.breakCompliance !== null) {
          metricsMap.breakCompliance = currentMetrics.breakCompliance;
        }
        if (currentMetrics.taskCompletionRate !== null) {
          metricsMap.taskCompletionRate = currentMetrics.taskCompletionRate;
        }
        if (currentMetrics.productivityIndex !== null) {
          metricsMap.productivityIndex = currentMetrics.productivityIndex;
        }
        if (currentMetrics.qualityScore !== null) {
          metricsMap.qualityScore = currentMetrics.qualityScore;
        }
        if (currentMetrics.efficiencyRate !== null) {
          metricsMap.efficiencyRate = currentMetrics.efficiencyRate;
        }
        
        // Legacy metrics (for backward compatibility)
        if (currentMetrics.service) {
          metricsMap.service = currentMetrics.service;
        }
        if (currentMetrics.productivity) {
          metricsMap.productivity = currentMetrics.productivity;
        }
        if (currentMetrics.quality) {
          metricsMap.quality = currentMetrics.quality;
        }
        if (currentMetrics.assiduity) {
          metricsMap.assiduity = currentMetrics.assiduity;
        }
        if (currentMetrics.performance) {
          metricsMap.performance = currentMetrics.performance;
        }
        if (currentMetrics.adherence) {
          metricsMap.adherence = currentMetrics.adherence;
        }
        if (currentMetrics.lateness) {
          metricsMap.lateness = currentMetrics.lateness;
        }
        if (currentMetrics.breakExceeds) {
          metricsMap.breakExceeds = currentMetrics.breakExceeds;
        }
      }

      agentScores.push(calculateOverallScore(metricsMap));
    });

    const averageScore = calculateAverage(agentScores);

    return {
      teamLeaderId: teamLeader.id,
      teamLeaderName: teamLeader.name || '',
      agentCount: teamLeader.agents.length,
      averageScore: roundToDecimals(averageScore, 0),
    };
  });

  // Get overall statistics
  const totalAgents = managerData.managedUsers.reduce((sum: number, tl: { agents: unknown[] }) => sum + tl.agents.length, 0);
  const overallAverage = calculateAverage(teamStats.map(team => team.averageScore));

  // Get recent sessions across all teams
  const recentSessions = await prisma.coachingSession.findMany({
    where: {
      teamLeader: {
        managedBy: managerId,
      },
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
      teamLeader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { sessionDate: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    user: {
      id: managerData.id,
      name: managerData.name,
      email: managerData.email,
      role: managerData.role,
    },
    overallStats: {
      totalTeamLeaders: managerData.managedUsers.length,
      totalAgents,
      overallAverageScore: roundToDecimals(overallAverage, 0),
    },
    teamStats,
    recentSessions,
  });
}

async function getAdminDashboard() {
  // Get system-wide statistics
  const userCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  });

  const sessionCounts = await prisma.coachingSession.groupBy({
    by: ['status'],
    _count: true,
  });

  const totalUsers = userCounts.reduce((sum, uc) => sum + uc._count, 0);
  const totalSessions = sessionCounts.reduce((sum, sc) => sum + sc._count, 0);

  // Get recent activity
  const recentSessions = await prisma.coachingSession.findMany({
    include: {
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
      teamLeader: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    systemStats: {
      totalUsers,
      usersByRole: userCounts,
      totalSessions,
      sessionsByStatus: sessionCounts,
    },
    recentActivity: {
      sessions: recentSessions,
      users: recentUsers,
    },
  });
}