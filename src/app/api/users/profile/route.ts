import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth-server';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for profile updates
const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email format'),
  department: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agentProfile: true,
        teamLeaderProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get department from the appropriate profile
    let department = null;
    if (user.agentProfile) {
      department = user.agentProfile.department;
    } else if (user.teamLeaderProfile) {
      department = user.teamLeaderProfile.department;
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    logger.error('Error fetching profile:', error as Error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = profileUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, email, department } = validationResult.data;

    // Check if email is being changed and if it's already taken
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Start a transaction to update user and profile atomically
    const result = await prisma.$transaction(async tx => {
      // Update user basic info
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name,
          email,
        },
        include: {
          agentProfile: true,
          teamLeaderProfile: true,
        },
      });

      // Update department in the appropriate profile
      if (department !== undefined) {
        if (updatedUser.agentProfile) {
          await tx.agent.update({
            where: { userId: session.user.id },
            data: { department },
          });
        } else if (updatedUser.teamLeaderProfile) {
          await tx.teamLeader.update({
            where: { userId: session.user.id },
            data: { department },
          });
        }
      }

      return updatedUser;
    });

    // Get the updated department
    let updatedDepartment: string | undefined = department;
    if (department !== undefined) {
      if (result.agentProfile) {
        const agent = await prisma.agent.findUnique({
          where: { userId: session.user.id },
        });
        updatedDepartment = agent?.department ?? undefined;
      } else if (result.teamLeaderProfile) {
        const teamLeader = await prisma.teamLeader.findUnique({
          where: { userId: session.user.id },
        });
        updatedDepartment = teamLeader?.department ?? undefined;
      }
    }

    // Log the profile update
    logger.info('Profile updated', {
      userId: session.user.id,
      changes: { name, email, department: updatedDepartment },
    });

    return NextResponse.json({
      id: result.id,
      name: result.name,
      email: result.email,
      department: updatedDepartment,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error('Error updating profile:', error as Error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
