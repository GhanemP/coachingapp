import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { UserRole } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canViewAgents = hasPermission(session.user.role as UserRole, 'agents', 'read');
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
        coachingSessions: {
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

    if (session.user.role === 'TEAM_LEADER' && agent.supervisedBy !== session.user.id) {
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