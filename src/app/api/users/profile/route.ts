import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, department } = body;

    // Update user basic info
    const updatedUser = await prisma.user.update({
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
        await prisma.agent.update({
          where: { userId: session.user.id },
          data: { department },
        });
      } else if (updatedUser.teamLeaderProfile) {
        await prisma.teamLeader.update({
          where: { userId: session.user.id },
          data: { department },
        });
      }
    }

    // Get the updated department
    let updatedDepartment = null;
    if (updatedUser.agentProfile) {
      const agent = await prisma.agent.findUnique({
        where: { userId: session.user.id },
      });
      updatedDepartment = agent?.department;
    } else if (updatedUser.teamLeaderProfile) {
      const teamLeader = await prisma.teamLeader.findUnique({
        where: { userId: session.user.id },
      });
      updatedDepartment = teamLeader?.department;
    }

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      department: updatedDepartment,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
