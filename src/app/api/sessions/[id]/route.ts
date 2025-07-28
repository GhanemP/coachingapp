import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canViewSessions = await hasPermission(
      session.user.role as UserRole,
      'view_sessions'
    );
    
    if (!canViewSessions) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const coachingSession = await prisma.coachingSession.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            agentProfile: true,
          },
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessionMetrics: true,
      },
    });

    if (!coachingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has access to this session
    if (session.user.role === 'AGENT' && coachingSession.agentId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user.role === 'TEAM_LEADER') {
      // Team leaders can view sessions if:
      // 1. They conducted the session, OR
      // 2. The agent is under their supervision
      const isSessionLeader = coachingSession.teamLeaderId === session.user.id;
      
      // Check if the agent is supervised by this team leader
      const agent = await prisma.user.findUnique({
        where: { id: coachingSession.agentId },
        select: { teamLeaderId: true }
      });
      
      const isAgentSupervisor = agent?.teamLeaderId === session.user.id;
      
      if (!isSessionLeader && !isAgentSupervisor) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(coachingSession);
  } catch (error) {
    logger.error('Error fetching session:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdateSessions = await hasPermission(
      session.user.role as UserRole,
      'manage_sessions'
    );
    
    if (!canUpdateSessions) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      sessionNotes, 
      actionItems, 
      followUpDate, 
      currentScore, 
      metrics 
    } = body;

    // Get the existing session
    const existingSession = await prisma.coachingSession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has permission to update this session
    if (session.user.role === 'TEAM_LEADER') {
      // Team leaders can update sessions if:
      // 1. They conducted the session, OR
      // 2. The agent is under their supervision
      const isSessionLeader = existingSession.teamLeaderId === session.user.id;
      
      // Check if the agent is supervised by this team leader
      const agent = await prisma.user.findUnique({
        where: { id: existingSession.agentId },
        select: { teamLeaderId: true }
      });
      
      const isAgentSupervisor = agent?.teamLeaderId === session.user.id;
      
      if (!isSessionLeader && !isAgentSupervisor) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Update the session
    const updatedSession = await prisma.coachingSession.update({
      where: { id },
      data: {
        sessionNotes,
        actionItems,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        currentScore,
        status: 'COMPLETED',
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            agentProfile: true,
          },
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessionMetrics: true,
      },
    });

    // Delete existing metrics and create new ones
    if (metrics && Array.isArray(metrics)) {
      await prisma.sessionMetric.deleteMany({
        where: { sessionId: id },
      });

      await prisma.sessionMetric.createMany({
        data: metrics.map((metric: { metricName: string; score: number; comments?: string }) => ({
          sessionId: id,
          metricName: metric.metricName,
          score: metric.score,
          comments: metric.comments || null,
        })),
      });

      // Fetch the updated session with new metrics
      const sessionWithMetrics = await prisma.coachingSession.findUnique({
        where: { id },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              agentProfile: true,
            },
          },
          teamLeader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          sessionMetrics: true,
        },
      });

      return NextResponse.json(sessionWithMetrics);
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    logger.error('Error updating session:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}