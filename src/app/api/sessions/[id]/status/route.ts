import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { UserRole, SessionStatus } from '@/lib/constants';
import logger from '@/lib/logger';

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
    const { status } = body;

    // Validate status
    if (!Object.values(SessionStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get the existing session
    const existingSession = await prisma.coachingSession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has permission to update this session
    if (session.user.role === 'TEAM_LEADER' && existingSession.teamLeaderId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the session status
    const updatedSession = await prisma.coachingSession.update({
      where: { id },
      data: {
        status,
        // If starting the session, update the session date
        ...(status === SessionStatus.IN_PROGRESS && {
          sessionDate: new Date(),
        }),
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

    return NextResponse.json(updatedSession);
  } catch (error) {
    logger.error('Error updating session status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}