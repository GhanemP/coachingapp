import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";

interface RolePermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface RoleData {
  role: UserRole;
  displayName: string;
  description: string;
  userCount: number;
  permissions: RolePermission[];
}

const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: [
    "manage_users",
    "manage_roles",
    "view_reports",
    "manage_system",
    "manage_database",
    "manage_sessions",
    "view_all_data",
  ],
  MANAGER: [
    "view_team_leaders",
    "manage_team_leaders",
    "view_reports",
    "manage_sessions",
    "view_team_data",
  ],
  TEAM_LEADER: [
    "view_agents",
    "manage_agents",
    "conduct_sessions",
    "view_agent_metrics",
  ],
  AGENT: [
    "view_own_metrics",
    "view_own_sessions",
    "update_profile",
  ],
};

const permissionDescriptions: Record<string, string> = {
  manage_users: "Create, update, and delete user accounts",
  manage_roles: "Modify role permissions and assignments",
  view_reports: "Access system-wide reports and analytics",
  manage_system: "Configure system settings and preferences",
  manage_database: "Access and manage database operations",
  manage_sessions: "Schedule and manage coaching sessions",
  view_all_data: "Access all data across the system",
  view_team_leaders: "View team leader profiles and performance",
  manage_team_leaders: "Assign and manage team leaders",
  view_team_data: "Access team performance metrics",
  view_agents: "View agent profiles and performance",
  manage_agents: "Assign and manage agents",
  conduct_sessions: "Conduct coaching sessions with agents",
  view_agent_metrics: "View detailed agent performance metrics",
  view_own_metrics: "View personal performance metrics",
  view_own_sessions: "View personal coaching sessions",
  update_profile: "Update personal profile information",
};

const roleDisplayNames: Record<UserRole, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager", 
  TEAM_LEADER: "Team Leader",
  AGENT: "Agent",
};

const roleDescriptions: Record<UserRole, string> = {
  ADMIN: "Full system access with all permissions",
  MANAGER: "Manage team leaders and view team performance",
  TEAM_LEADER: "Manage agents and conduct coaching sessions", 
  AGENT: "Call center agent with basic access",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user counts for each role
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    // Create user count map
    const userCountMap: Record<UserRole, number> = {
      ADMIN: 0,
      MANAGER: 0, 
      TEAM_LEADER: 0,
      AGENT: 0,
    };

    userCounts.forEach(count => {
      if (count.role in userCountMap) {
        userCountMap[count.role as UserRole] = count._count.role;
      }
    });

    // Build role data
    const roles: RoleData[] = Object.values(UserRole).map(role => ({
      role,
      displayName: roleDisplayNames[role],
      description: roleDescriptions[role],
      userCount: userCountMap[role],
      permissions: rolePermissions[role].map(perm => ({
        id: perm,
        name: perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: permissionDescriptions[perm],
        enabled: true, // For now, all permissions are enabled
      })),
    }));

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}
