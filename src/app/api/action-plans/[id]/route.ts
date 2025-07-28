import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Schema for updating an action plan
const updateActionPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/action-plans/[id] - Get a specific action plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const actionPlan = await prisma.actionPlan.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            teamLeaderId: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!actionPlan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === UserRole.AGENT && actionPlan.agentId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user.role === UserRole.TEAM_LEADER) {
      const agent = await prisma.user.findUnique({
        where: { id: actionPlan.agentId },
        select: { teamLeaderId: true },
      });
      
      if (agent?.teamLeaderId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Calculate progress
    const totalItems = actionPlan.items.length;
    const completedItems = actionPlan.items.filter(item => item.status === 'COMPLETED').length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      ...actionPlan,
      completionPercentage,
      totalItems,
      completedItems,
    });
  } catch (error) {
    logger.error('Error fetching action plan:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch action plan' },
      { status: 500 }
    );
  }
}

// PATCH /api/action-plans/[id] - Update an action plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only team leaders, managers, and admins can update action plans
    if (session.user.role === UserRole.AGENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateActionPlanSchema.parse(body);

    const { id } = await params;
    // Get the action plan to check permissions
    const actionPlan = await prisma.actionPlan.findUnique({
      where: { id },
      select: {
        agentId: true,
        status: true,
        agent: {
          select: { teamLeaderId: true },
        },
      },
    });

    if (!actionPlan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    // Check permissions based on role
    if (session.user.role === UserRole.TEAM_LEADER && actionPlan.agent.teamLeaderId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    interface UpdateData {
      title?: string;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      approvedBy?: string;
      approvedAt?: Date;
    }
    const updateData: UpdateData = {};
    if (validatedData.title) {updateData.title = validatedData.title;}
    if (validatedData.description) {updateData.description = validatedData.description;}
    if (validatedData.startDate) {updateData.startDate = new Date(validatedData.startDate);}
    if (validatedData.endDate) {updateData.endDate = new Date(validatedData.endDate);}
    
    // Handle status changes
    if (validatedData.status) {
      updateData.status = validatedData.status;
      
      // If approving the plan (changing from DRAFT to ACTIVE)
      if (actionPlan.status === 'DRAFT' && validatedData.status === 'ACTIVE') {
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();
      }
    }

    // Update the action plan
    const updatedPlan = await prisma.actionPlan.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'ACTION_PLAN',
        resourceId: id,
        details: {
          changes: validatedData,
        },
      },
    });

    // Create notification if status changed
    if (validatedData.status && validatedData.status !== actionPlan.status) {
      await prisma.notification.create({
        data: {
          userId: actionPlan.agentId,
          type: 'ACTION_PLAN_STATUS_CHANGED',
          title: 'Action Plan Status Updated',
          message: `Your action plan "${updatedPlan.title}" status has been changed to ${validatedData.status}.`,
          data: {
            actionPlanId: id,
            oldStatus: actionPlan.status,
            newStatus: validatedData.status,
          },
        },
      });
    }

    return NextResponse.json(updatedPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error updating action plan:', error as Error);
    return NextResponse.json(
      { error: 'Failed to update action plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/action-plans/[id] - Delete an action plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can delete action plans
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    // Get the action plan to check if it exists
    const actionPlan = await prisma.actionPlan.findUnique({
      where: { id },
      select: {
        title: true,
        agentId: true,
      },
    });

    if (!actionPlan) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    // Delete the action plan (items will be cascade deleted)
    await prisma.actionPlan.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'ACTION_PLAN',
        resourceId: id,
        details: {
          title: actionPlan.title,
          agentId: actionPlan.agentId,
        },
      },
    });

    return NextResponse.json({ message: 'Action plan deleted successfully' });
  } catch (error) {
    logger.error('Error deleting action plan:', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete action plan' },
      { status: 500 }
    );
  }
}