import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { hasPermission, hasPermissionSync } from '@/lib/rbac';
import { UserRole } from '@/lib/constants';

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
// Check permissions using resource-based approach
const canViewAgents = session.user.role === 'ADMIN' || 
  await hasPermissionSync(session.user.role, 'agents');
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

    // Check access permissions
    if (session.user.role === 'AGENT' && agent.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user.role === 'TEAM_LEADER' && agent.teamLeaderId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}