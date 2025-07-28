import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { invalidateAgentCache, deleteCachePattern, CACHE_KEYS } from '@/lib/redis';

// Validation schema for updating quick note
const updateQuickNoteSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  category: z.enum(['PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'OTHER']).optional(),
  isPrivate: z.boolean().optional(),
});

// GET /api/quick-notes/[id] - Get a single quick note
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const quickNote = await prisma.quickNote.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!quickNote) {
      return NextResponse.json({ error: 'Quick note not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'AGENT') {
      // Agents can see:
      // 1. Notes where they are the agent (regardless of privacy if they authored it)
      // 2. Notes they authored
      // 3. Public notes about them
      const canAccess =
        quickNote.authorId === session.user.id || // They authored it
        (quickNote.agentId === session.user.id && !quickNote.isPrivate); // Public note about them

      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (session.user.role === 'TEAM_LEADER') {
      const agent = await prisma.user.findUnique({
        where: { id: quickNote.agentId },
        select: { teamLeaderId: true },
      });

      // Team leaders can see:
      // 1. All notes they authored
      // 2. Public notes about their agents
      // 3. Private notes about their agents ONLY if they authored them
      const isTheirAgent = agent?.teamLeaderId === session.user.id;
      const canAccess =
        quickNote.authorId === session.user.id || // They authored it
        (isTheirAgent && !quickNote.isPrivate); // Public note about their agent

      if (!canAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    // Managers can see all notes

    return NextResponse.json(quickNote);
  } catch (error) {
    logger.error('Error fetching quick note:', error as Error);
    return NextResponse.json({ error: 'Failed to fetch quick note' }, { status: 500 });
  }
}

// PATCH /api/quick-notes/[id] - Update a quick note
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateQuickNoteSchema.parse(body);

    const { id } = await params;
    // Check if the quick note exists and user has permission to update
    const existingNote = await prisma.quickNote.findUnique({
      where: { id },
      select: { authorId: true, agentId: true },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Quick note not found' }, { status: 404 });
    }

    // Only the author can update the note
    if (existingNote.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the author can update this note' }, { status: 403 });
    }

    // Update quick note
    const updatedNote = await prisma.quickNote.update({
      where: { id },
      data: validatedData,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'QUICK_NOTE',
        resourceId: id,
        details: validatedData,
      },
    });

    // Invalidate related caches
    await invalidateAgentCache(existingNote.agentId);
    await deleteCachePattern(`${CACHE_KEYS.QUICK_NOTES}*`);

    return NextResponse.json(updatedNote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    logger.error('Error updating quick note:', error as Error);
    return NextResponse.json({ error: 'Failed to update quick note' }, { status: 500 });
  }
}

// DELETE /api/quick-notes/[id] - Delete a quick note
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
    // Check if the quick note exists and user has permission to delete
    const existingNote = await prisma.quickNote.findUnique({
      where: { id },
      select: { authorId: true, agentId: true },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Quick note not found' }, { status: 404 });
    }

    // Only the author or a manager can delete the note
    if (existingNote.authorId !== session.user.id && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only the author or a manager can delete this note' },
        { status: 403 }
      );
    }

    // Delete quick note
    await prisma.quickNote.delete({
      where: { id },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'QUICK_NOTE',
        resourceId: id,
      },
    });

    // Invalidate related caches
    await invalidateAgentCache(existingNote.agentId);
    await deleteCachePattern(`${CACHE_KEYS.QUICK_NOTES}*`);

    return NextResponse.json({ message: 'Quick note deleted successfully' });
  } catch (error) {
    logger.error('Error deleting quick note:', error as Error);
    return NextResponse.json({ error: 'Failed to delete quick note' }, { status: 500 });
  }
}
