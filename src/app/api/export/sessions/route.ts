import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import { format } from "date-fns";
import logger from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionIds = searchParams.getAll('sessionIds');
    
    // Build where clause based on role and selected sessions
    const where: Record<string, unknown> = {};
    
    if (sessionIds.length > 0) {
      where.id = { in: sessionIds };
    }
    
    // Role-based filtering
    if (session.user.role === UserRole.AGENT) {
      where.agentId = session.user.id;
    } else if (session.user.role === UserRole.TEAM_LEADER) {
      where.teamLeaderId = session.user.id;
    }

    const sessions = await prisma.coachingSession.findMany({
      where,
      include: {
        agent: {
          select: {
            name: true,
            email: true,
            agentProfile: {
              select: {
                employeeId: true,
                department: true
              }
            }
          }
        },
        teamLeader: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    });

    // Create CSV content
    const headers = [
      'Session ID',
      'Agent Name',
      'Agent Email',
      'Employee ID',
      'Department',
      'Team Leader',
      'Team Leader Email',
      'Scheduled Date',
      'Status',
      'Duration (minutes)',
      'Previous Score',
      'Current Score',
      'Score Improvement',
      'Session Title',
      'Focus Areas',
      'Action Items Count'
    ];

    const rows = sessions.map(session => {
      let preparationData = null;
      let sessionData = null;
      
      try {
        if (session.preparationNotes) {
          preparationData = JSON.parse(session.preparationNotes);
        }
        if (session.sessionNotes) {
          sessionData = JSON.parse(session.sessionNotes);
        }
      } catch {
        // Ignore parsing errors
      }

      const scoreImprovement = session.currentScore && session.previousScore 
        ? session.currentScore - session.previousScore 
        : null;

      const actionItemsCount = session.actionItems 
        ? session.actionItems.split('\n').filter(item => item.trim()).length 
        : 0;

      return [
        session.id,
        session.agent.name,
        session.agent.email,
        session.agent.agentProfile?.employeeId || '',
        session.agent.agentProfile?.department || '',
        session.teamLeader.name,
        session.teamLeader.email,
        format(new Date(session.scheduledDate), 'yyyy-MM-dd HH:mm'),
        session.status,
        session.duration || 60,
        session.previousScore || '',
        session.currentScore || '',
        scoreImprovement !== null ? scoreImprovement : '',
        preparationData?.title || sessionData?.title || 'Coaching Session',
        preparationData?.focusAreas?.join('; ') || sessionData?.focusAreas?.join('; ') || '',
        actionItemsCount
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sessions-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`
      }
    });
  } catch (error) {
    logger.error("Error exporting sessions:", error);
    return NextResponse.json(
      { error: "Failed to export sessions" },
      { status: 500 }
    );
  }
}