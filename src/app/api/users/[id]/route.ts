import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth-server";
import { UserRole } from "@/lib/constants";
import logger from '@/lib/logger';
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managedBy: true,
        teamLeaderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error("Error fetching user:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, role, password, managedBy, teamLeaderId } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it's already taken
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });

      if (emailTaken) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Validate hierarchical assignments
    if (managedBy) {
      const manager = await prisma.user.findUnique({
        where: { id: managedBy, role: UserRole.MANAGER }
      });
      if (!manager) {
        return NextResponse.json(
          { error: "Invalid manager assignment" },
          { status: 400 }
        );
      }
    }

    if (teamLeaderId) {
      const teamLeader = await prisma.user.findUnique({
        where: { id: teamLeaderId, role: UserRole.TEAM_LEADER }
      });
      if (!teamLeader) {
        return NextResponse.json(
          { error: "Invalid team leader assignment" },
          { status: 400 }
        );
      }
    }

    // Role-based assignment validation
    if (role === UserRole.AGENT && managedBy) {
      return NextResponse.json(
        { error: "Agents cannot be directly assigned to managers" },
        { status: 400 }
      );
    }

    if (role === UserRole.TEAM_LEADER && teamLeaderId) {
      return NextResponse.json(
        { error: "Team leaders cannot be assigned to other team leaders" },
        { status: 400 }
      );
    }

    if ((role === UserRole.MANAGER || role === UserRole.ADMIN) && (managedBy || teamLeaderId)) {
      return NextResponse.json(
        { error: "Managers and admins cannot be assigned to others" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      name: string;
      email: string;
      role: UserRole;
      hashedPassword?: string;
      managedBy?: string | null;
      teamLeaderId?: string | null;
    } = {
      name,
      email,
      role,
      managedBy: managedBy || null,
      teamLeaderId: teamLeaderId || null,
    };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managedBy: true,
        teamLeaderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    logger.error("Error updating user:", error as Error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error as Error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
