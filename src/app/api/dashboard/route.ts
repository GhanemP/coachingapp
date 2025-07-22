import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { UserRole, SessionStatus } from '@/lib/constants';
import { calculateOverallScore } from '@/lib/metrics';

export const runtime = 'nodejs';

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
    console.error('Error fetching dashboard data:', error);
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
  // Get team leader with their agents
  const teamLeader = await prisma.user.findUnique({
    where: { id: teamLeaderId },
    include: {
      agents: {
        include: {
          agentProfile: true,
        },
      },
    },
  });

  if (!teamLeader) {
    return NextResponse.json({ error: 'Team leader not found' }, { status: 404 });
  }

  // Get agent performance summaries
  const agentPerformance = await Promise.all(
    teamLeader.agents.map(async (agent) => {
      if (!agent.agentProfile) return null;

      const metrics = await prisma.performance.findMany({
        where: {
          agentId: agent.agentProfile.id,
          period: '2025-01',
        },
      });

      const metricsMap = metrics.reduce((acc, metric) => {
        acc[metric.metricType] = metric.score;
        return acc;
      }, {} as Record<string, number>);

      const overallScore = calculateOverallScore(metricsMap);

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        employeeId: agent.agentProfile.employeeId,
        overallScore,
        metrics: metricsMap,
      };
    })
  );

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
    totalAgents: teamLeader.agents.length,
    scheduledSessions: sessionStats.find(s => s.status === SessionStatus.SCHEDULED)?._count || 0,
    completedSessions: sessionStats.find(s => s.status === SessionStatus.COMPLETED)?._count || 0,
    averageScore: agentPerformance
      .filter(a => a !== null)
      .reduce((sum, a) => sum + (a?.overallScore || 0), 0) / teamLeader.agents.length,
  };

  return NextResponse.json({
    user: {
      id: teamLeader.id,
      name: teamLeader.name,
      email: teamLeader.email,
      role: teamLeader.role,
    },
    teamStats: stats,
    agents: agentPerformance.filter(a => a !== null),
    upcomingSessions,
  });
}

async function getManagerDashboard(managerId: string) {
  // Get manager with team leaders
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    include: {
      teamLeaders: {
        include: {
          agents: {
            include: {
              agentProfile: true,
            },
          },
        },
      },
    },
  });

  if (!manager) {
    return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
  }

  // Calculate team statistics
  const teamStats = await Promise.all(
    manager.teamLeaders.map(async (teamLeader) => {
      const agentScores = await Promise.all(
        teamLeader.agents.map(async (agent) => {
          if (!agent.agentProfile) return 0;

          const metrics = await prisma.performance.findMany({
            where: {
              agentId: agent.agentProfile.id,
              period: '2025-01',
            },
          });

          const metricsMap = metrics.reduce((acc, metric) => {
            acc[metric.metricType] = metric.score;
            return acc;
          }, {} as Record<string, number>);

          return calculateOverallScore(metricsMap);
        })
      );

      const averageScore = agentScores.reduce((sum, score) => sum + score, 0) / agentScores.length;

      return {
        teamLeaderId: teamLeader.id,
        teamLeaderName: teamLeader.name,
        agentCount: teamLeader.agents.length,
        averageScore: Math.round(averageScore),
      };
    })
  );

  // Get overall statistics
  const totalAgents = manager.teamLeaders.reduce((sum, tl) => sum + tl.agents.length, 0);
  const overallAverage = teamStats.reduce((sum, team) => sum + team.averageScore, 0) / teamStats.length;

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
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: manager.role,
    },
    overallStats: {
      totalTeamLeaders: manager.teamLeaders.length,
      totalAgents,
      overallAverageScore: Math.round(overallAverage),
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