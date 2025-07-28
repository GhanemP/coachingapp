import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Validation schema for updating action item
const updateActionItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
});

// GET /api/action-items/[id] - Get a single action item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const actionItem = await prisma.actionItem.findUnique({
      where: { id },
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
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        session: {
          select: {
            id: true,
            sessionDate: true,
            status: true,
          },
        },
      },
    });

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'AGENT') {
      if (actionItem.agentId !== session.user.id && 
          actionItem.assignedTo !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (session.user.role === 'TEAM_LEADER') {
      const agent = await prisma.user.findUnique({
        where: { id: actionItem.agentId },
        select: { teamLeaderId: true }
      });
      
      if (agent?.teamLeaderId !== session.user.id && 
          actionItem.createdBy !== session.user.id &&
          actionItem.assignedTo !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json(actionItem);
  } catch (error) {
    logger.error('Error fetching action item:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch action item' },
      { status: 500 }
    );
  }
}

// PATCH /api/action-items/[id] - Update an action item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateActionItemSchema.parse(body);

    const { id } = await params;
    // Check if the action item exists and user has permission to update
    const existingItem = await prisma.actionItem.findUnique({
      where: { id },
      select: { 
        agentId: true, 
        createdBy: true, 
        assignedTo: true,
        status: true,
      }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Check permissions
    let canUpdate = false;
    if (session.user.role === 'MANAGER' || session.user.role === 'ADMIN') {
      canUpdate = true;
    } else if (session.user.role === 'TEAM_LEADER') {
      const agent = await prisma.user.findUnique({
        where: { id: existingItem.agentId },
        select: { teamLeaderId: true }
      });
      canUpdate = agent?.teamLeaderId === session.user.id || 
                  existingItem.createdBy === session.user.id;
    } else if (session.user.role === 'AGENT') {
      // Agents can only update status if they are assigned
      canUpdate = existingItem.assignedTo === session.user.id;
      if (canUpdate && validatedData.status) {
        // Agents can only update status, not other fields
        Object.keys(validatedData).forEach(key => {
          if (key !== 'status') {delete (validatedData as Record<string, unknown>)[key];}
        });
      }
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You do not have permission to update this action item' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Prisma.ActionItemUpdateInput = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }
    if (validatedData.status === 'COMPLETED' && existingItem.status !== 'COMPLETED') {
      updateData.completedDate = new Date();
    }

    // Update action item
    const updatedItem = await prisma.actionItem.update({
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
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        session: {
          select: {
            id: true,
            sessionDate: true,
            status: true,
          },
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'ACTION_ITEM',
        resourceId: id,
        details: validatedData,
      },
    });

    // Create notification if status changed to completed
    if (validatedData.status === 'COMPLETED' && existingItem.status !== 'COMPLETED') {
      if (existingItem.createdBy !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: existingItem.createdBy,
            type: 'ACTION_ITEM_COMPLETED',
            title: 'Action Item Completed',
            message: `Action item "${updatedItem.title}" has been completed`,
            data: {
              actionItemId: updatedItem.id,
              completedBy: session.user.id,
            },
          },
        });
      }
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('Error updating action item:', error as Error);
    return NextResponse.json(
      { error: 'Failed to update action item' },
      { status: 500 }
    );
  }
}

// DELETE /api/action-items/[id] - Delete an action item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Check if the action item exists and user has permission to delete
    const existingItem = await prisma.actionItem.findUnique({
      where: { id },
      select: { agentId: true, createdBy: true }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Check permissions
    let canDelete = false;
    if (session.user.role === 'MANAGER' || session.user.role === 'ADMIN') {
      canDelete = true;
    } else if (session.user.role === 'TEAM_LEADER') {
      const agent = await prisma.user.findUnique({
        where: { id: existingItem.agentId },
        select: { teamLeaderId: true }
      });
      canDelete = agent?.teamLeaderId === session.user.id || 
                  existingItem.createdBy === session.user.id;
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this action item' },
        { status: 403 }
      );
    }

    // Delete action item
    await prisma.actionItem.delete({
      where: { id },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'ACTION_ITEM',
        resourceId: id,
      },
    });

    return NextResponse.json({ message: 'Action item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting action item:', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete action item' },
      { status: 500 }
    );
  }
}