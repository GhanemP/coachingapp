import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const session = await getSession();

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

    // Get all permissions for each role from the database
    const roles: RoleData[] = [];
    
    for (const role of Object.values(UserRole)) {
      // Get permissions for this role
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role },
        include: {
          permission: true,
        },
        orderBy: {
          permission: {
            resource: 'asc',
          },
        },
      });

      const permissions: RolePermission[] = rolePermissions.map(rp => ({
        id: rp.permission.name,
        name: rp.permission.name, // Using name as displayName doesn't exist
        description: rp.permission.description || '',
        enabled: true, // Since we don't have an enabled field, assume all are enabled
      }));

      roles.push({
        role,
        displayName: roleDisplayNames[role],
        description: roleDescriptions[role],
        userCount: userCountMap[role],
        permissions,
      });
    }

    return NextResponse.json(roles);
  } catch (error) {
    logger.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}
