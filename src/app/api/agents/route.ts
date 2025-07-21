import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only team leaders, managers, and admins can view all agents
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agents = await prisma.user.findMany({
      where: {
        role: UserRole.AGENT
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        agentProfile: {
          select: {
            employeeId: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the data to flatten the structure
    const transformedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      employeeId: agent.agentProfile?.employeeId || '',
      createdAt: agent.createdAt
    }));

    return NextResponse.json(transformedAgents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}