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

    // Check permissions
    const canViewAgents = session.user.role === 'ADMIN' ||
      await hasPermission(session.user.role as UserRole, 'view_agents');
    if (!canViewAgents) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agent = await prisma.user.findUnique({
      where: {
        id,
        role: 'AGENT'
      },
      include: {
        agentProfile: true,
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessionsAsAgent: {
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
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check access permissions based on role hierarchy
    if (session.user.role === 'AGENT' && agent.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user.role === 'TEAM_LEADER') {
      const teamLeader = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { agents: true }
      });

      const isTeamMember = teamLeader?.agents.some(a => a.id === agent.id);
      if (!isTeamMember && agent.id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(agent);
  } catch (error) {
    logger.error('Error fetching agent:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}