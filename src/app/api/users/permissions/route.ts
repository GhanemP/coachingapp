import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth-server";
import logger from '@/lib/logger';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's role-based permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: session.user.role,
      },
      include: {
        permission: true,
      },
    });

    // Get user's direct permissions (if any)
    const userPermissions = await prisma.permission.findMany({
      where: {
        users: {
          some: {
            id: session.user.id,
          },
        },
      },
    });

    // Combine and deduplicate permissions
    const allPermissions = [
      ...rolePermissions.map(rp => rp.permission),
      ...userPermissions,
    ];

    const uniquePermissions = Array.from(
      new Map(allPermissions.map(p => [p.name, p])).values()
    );

    return NextResponse.json({
      permissions: uniquePermissions.map(p => p.name),
      permissionDetails: uniquePermissions,
    });
  } catch (error) {
    logger.error("Error fetching user permissions:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
