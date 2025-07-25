import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { UserRole, SessionStatus } from "@/lib/constants";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Different queries based on role
    let sessions;
    
    if (session.user.role === UserRole.AGENT) {
      // Agents see only their own sessions
      sessions = await prisma.coachingSession.findMany({
        where: {
          agentId: session.user.id
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
        },
        orderBy: {
          scheduledDate: 'desc'
        }
      });
    } else {
      const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
      if (!allowedRoles.includes(session.user.role as UserRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Team leaders see sessions they conduct
      sessions = await prisma.coachingSession.findMany({
        where: session.user.role === UserRole.TEAM_LEADER 
          ? { teamLeaderId: session.user.id }
          : {}, // Managers and admins see all sessions
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
          scheduledDate: 'desc'
        }
      });
    }

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
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
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}