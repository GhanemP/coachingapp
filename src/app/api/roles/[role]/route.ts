import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import { clearPermissionCache } from "@/lib/rbac";
import logger from '@/lib/logger';

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

export async function GET(
  request: Request,
  context: { params: Promise<{ role: string }> }
) {
  try {
    const { role: roleParam } = await context.params;
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Convert role parameter to UserRole enum
    const role = roleParam.toUpperCase() as UserRole;
    
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Get user count for this role
    const userCount = await prisma.user.count({
      where: { role },
    });

    // Get all available permissions
    const allPermissions = await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ],
    });

    // Get permissions assigned to this role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true,
      },
    });

    // Create a set of assigned permission IDs for quick lookup
    const assignedPermissionIds = new Set(
      rolePermissions.map(rp => rp.permission.name)
    );

    // Map all permissions with their enabled status
    const permissions = allPermissions.map(permission => ({
      id: permission.name,
      name: permission.name,
      description: permission.description || '',
      enabled: assignedPermissionIds.has(permission.name),
    }));

    const roleData = {
      role,
      displayName: roleDisplayNames[role],
      description: roleDescriptions[role],
      userCount,
      permissions,
    };

    return NextResponse.json(roleData);
  } catch (error) {
    logger.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ role: string }> }
) {
  try {
    const { role: roleParam } = await context.params;
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Convert role parameter to UserRole enum
    const role = roleParam.toUpperCase() as UserRole;
    
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Invalid permissions format" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Get all current role permissions
      const currentRolePermissions = await tx.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      });

      // Create maps for easier lookup
      const currentPermissionMap = new Map(
        currentRolePermissions.map(rp => [rp.permission.name, rp])
      );

      // Process each permission
      for (const permission of permissions) {
        const { id: permissionName, enabled } = permission;
        
        // Find the permission record
        const permissionRecord = await tx.permission.findUnique({
          where: { name: permissionName },
        });

        if (!permissionRecord) {
          logger.warn(`Permission not found: ${permissionName}`);
          continue;
        }

        const existingRolePermission = currentPermissionMap.get(permissionName);

        if (enabled && !existingRolePermission) {
          // Add permission if enabled and not already assigned
          await tx.rolePermission.create({
            data: {
              role,
              permissionId: permissionRecord.id,
            },
          });
          logger.info(`Added permission ${permissionName} to role ${role}`);
        } else if (!enabled && existingRolePermission) {
          // Remove permission if disabled and currently assigned
          await tx.rolePermission.delete({
            where: {
              id: existingRolePermission.id,
            },
          });
          logger.info(`Removed permission ${permissionName} from role ${role}`);
        }
      }
    });

    // Clear permission cache so changes take effect immediately
    clearPermissionCache();

    return NextResponse.json({ 
      success: true, 
      message: "Permissions updated successfully" 
    });
  } catch (error) {
    logger.error("Error updating role permissions:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}
