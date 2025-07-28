import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Schema for updating an action plan item
const updateActionPlanItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  targetMetric: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  dueDate: z.string().datetime().optional(),
});

// GET /api/action-plans/[id]/items/[itemId] - Get a specific action plan item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const item = await prisma.actionPlanItem.findUnique({
      where: { id: itemId },
      include: {
        actionPlan: {
          select: {
            id: true,
            title: true,
            agentId: true,
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
                teamLeaderId: true,
              },
            },
          },
        },
      },
    });

    if (!item || item.actionPlan.id !== id) {
      return NextResponse.json({ error: 'Action plan item not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === UserRole.AGENT && item.actionPlan.agentId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.user.role === UserRole.TEAM_LEADER) {
      if (item.actionPlan.agent.teamLeaderId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(item);
  } catch (error) {
    logger.error('Error fetching action plan item:', error as Error);
    return NextResponse.json({ error: 'Failed to fetch action plan item' }, { status: 500 });
  }
}

// PATCH /api/action-plans/[id]/items/[itemId] - Update an action plan item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateActionPlanItemSchema.parse(body);

    const { id, itemId } = await params;
    // Get the item to check permissions
    const item = await prisma.actionPlanItem.findUnique({
      where: { id: itemId },
      select: {
        status: true,
        actionPlan: {
          select: {
            id: true,
            agentId: true,
            agent: {
              select: { teamLeaderId: true },
            },
          },
        },
      },
    });

    if (!item || item.actionPlan.id !== id) {
      return NextResponse.json({ error: 'Action plan item not found' }, { status: 404 });
    }

    // Check permissions - agents can update their own items, others need higher permissions
    if (session.user.role === UserRole.AGENT) {
      if (item.actionPlan.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Agents can only update status and current value
      const allowedUpdates = ['status', 'currentValue'];
      const requestedUpdates = Object.keys(validatedData);
      const hasDisallowedUpdates = requestedUpdates.some(key => !allowedUpdates.includes(key));

      if (hasDisallowedUpdates) {
        return NextResponse.json(
          {
            error: 'Agents can only update status and current value',
          },
          { status: 403 }
        );
      }
    } else if (session.user.role === UserRole.TEAM_LEADER) {
      if (item.actionPlan.agent.teamLeaderId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build update data
    interface UpdateData {
      title?: string;
      description?: string;
      targetMetric?: string;
      targetValue?: number;
      currentValue?: number;
      status?: string;
      dueDate?: Date;
      completedDate?: Date | null;
    }
    const updateData: UpdateData = {};

    if (validatedData.title) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description) {
      updateData.description = validatedData.description;
    }
    if (validatedData.targetMetric) {
      updateData.targetMetric = validatedData.targetMetric;
    }
    if (validatedData.targetValue !== undefined) {
      updateData.targetValue = validatedData.targetValue;
    }
    if (validatedData.currentValue !== undefined) {
      updateData.currentValue = validatedData.currentValue;
    }
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    // Handle status changes
    if (validatedData.status) {
      updateData.status = validatedData.status;

      // Set completed date when marking as completed
      if (validatedData.status === 'COMPLETED' && item.status !== 'COMPLETED') {
        updateData.completedDate = new Date();
      } else if (validatedData.status !== 'COMPLETED') {
        updateData.completedDate = null;
      }
    }

    // Update the item
    const updatedItem = await prisma.actionPlanItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        actionPlan: {
          select: {
            id: true,
            title: true,
            agentId: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'ACTION_PLAN_ITEM',
        resourceId: itemId,
        details: {
          actionPlanId: id,
          changes: validatedData,
        },
      },
    });

    // Create notification if status changed
    if (validatedData.status && validatedData.status !== item.status) {
      // Notify the agent if someone else updated their item
      if (session.user.id !== item.actionPlan.agentId) {
        await prisma.notification.create({
          data: {
            userId: item.actionPlan.agentId,
            type: 'ACTION_PLAN_ITEM_UPDATED',
            title: 'Action Plan Item Updated',
            message: `An item in your action plan has been updated: "${updatedItem.title}" is now ${validatedData.status}.`,
            data: {
              actionPlanId: id,
              itemId: itemId,
              oldStatus: item.status,
              newStatus: validatedData.status,
            },
          },
        });
      }
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error updating action plan item:', error as Error);
    return NextResponse.json({ error: 'Failed to update action plan item' }, { status: 500 });
  }
}

// DELETE /api/action-plans/[id]/items/[itemId] - Delete an action plan item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only team leaders, managers and admins can delete items
    if (session.user.role === UserRole.AGENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, itemId } = await params;
    // Get the item to check if it exists and permissions
    const item = await prisma.actionPlanItem.findUnique({
      where: { id: itemId },
      select: {
        title: true,
        actionPlan: {
          select: {
            id: true,
            agentId: true,
            agent: {
              select: { teamLeaderId: true },
            },
          },
        },
      },
    });

    if (!item || item.actionPlan.id !== id) {
      return NextResponse.json({ error: 'Action plan item not found' }, { status: 404 });
    }

    // Check permissions for team leaders
    if (session.user.role === UserRole.TEAM_LEADER) {
      if (item.actionPlan.agent.teamLeaderId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete the item
    await prisma.actionPlanItem.delete({
      where: { id: itemId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'ACTION_PLAN_ITEM',
        resourceId: itemId,
        details: {
          actionPlanId: id,
          title: item.title,
        },
      },
    });

    // Notify the agent
    await prisma.notification.create({
      data: {
        userId: item.actionPlan.agentId,
        type: 'ACTION_PLAN_ITEM_DELETED',
        title: 'Action Plan Item Deleted',
        message: `An item "${item.title}" has been removed from your action plan.`,
        data: {
          actionPlanId: id,
          itemTitle: item.title,
        },
      },
    });

    return NextResponse.json({ message: 'Action plan item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting action plan item:', error as Error);
    return NextResponse.json({ error: 'Failed to delete action plan item' }, { status: 500 });
  }
}
