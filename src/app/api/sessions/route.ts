import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { UserRole, SessionStatus } from "@/lib/constants";
import { Prisma } from "@prisma/client";
import logger from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const sortBy = searchParams.get('sortBy') || 'scheduledDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const status = searchParams.get('status');
    const agentId = searchParams.get('agentId');
    const teamLeaderId = searchParams.get('teamLeaderId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // Build where clause
    const where: Prisma.CoachingSessionWhereInput = {};

    // Role-based filtering
    if (session.user.role === UserRole.AGENT) {
      where.agentId = session.user.id;
    } else if (session.user.role === UserRole.TEAM_LEADER) {
      where.teamLeaderId = session.user.id;
    }

    // Additional filters
    if (status) {
      where.status = status;
    }
    if (agentId) {
      where.agentId = agentId;
    }
    if (teamLeaderId) {
      where.teamLeaderId = teamLeaderId;
    }
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) {
        where.scheduledDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.scheduledDate.lte = new Date(dateTo);
      }
    }
    if (search) {
      where.OR = [
        { agent: { name: { contains: search } } },
        { agent: { email: { contains: search } } },
        { teamLeader: { name: { contains: search } } },
        { preparationNotes: { contains: search } }
      ];
    }

    // Get total count
    const totalCount = await prisma.coachingSession.count({ where });

    // Check permissions
    const allowedRoles: UserRole[] = [UserRole.AGENT, UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch sessions with pagination
    const sessions = await prisma.coachingSession.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            agentProfile: {
              select: {
                employeeId: true
              }
            }
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });
  } catch (error) {
    logger.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only team leaders, managers, and admins can create sessions
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      agentId,
      scheduledDate,
      preparationNotes,
      duration,
      status = SessionStatus.SCHEDULED,
      title,
      focusAreas,
      resources
    } = body;

    // Validate required fields
    if (!agentId || !scheduledDate) {
      return NextResponse.json(
        { error: "Agent ID and scheduled date are required" },
        { status: 400 }
      );
    }

    // Create the session
    const newSession = await prisma.coachingSession.create({
      data: {
        agentId,
        teamLeaderId: session.user.id,
        scheduledDate: new Date(scheduledDate),
        sessionDate: new Date(scheduledDate), // Initially same as scheduled date
        preparationNotes,
        duration: duration || 60,
        status,
        // Store additional data in preparationNotes as JSON for now
        // In a real implementation, you'd add these fields to the schema
        sessionNotes: JSON.stringify({
          title: title || `Coaching Session - ${new Date(scheduledDate).toLocaleDateString()}`,
          focusAreas: focusAreas || [],
          resources: resources || []
        })
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    logger.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}