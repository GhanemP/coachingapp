import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, ActionItem } from '@prisma/client';
import { notifyActionItemCreated } from '@/lib/socket-helpers';
import { getCache, setCache, invalidateAgentCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';
import logger from '@/lib/logger';

// Type for cached response
interface ActionItemsResponse {
  actionItems: (ActionItem & {
    agent: {
      id: string;
      name: string;
      email: string;
    };
    creator: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    };
    assignee: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    } | null;
    session: {
      id: string;
      sessionDate: Date;
      status: string;
    } | null;
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Validation schema for action item
const actionItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  dueDate: z.string().datetime(),
  agentId: z.string(),
  sessionId: z.string().optional(),
  assignedTo: z.string().optional(),
});

// GET /api/action-items - Get action items
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const agentId = searchParams.get('agentId');
    const assignedTo = searchParams.get('assignedTo');
    const sessionId = searchParams.get('sessionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.ACTION_ITEMS}${session.user.id}:${status || 'all'}:${priority || 'all'}:${agentId || 'all'}:${assignedTo || 'all'}:${sessionId || 'all'}:${page}:${limit}`;
    const cachedData = await getCache<ActionItemsResponse>(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Build where clause based on user role
    const where: Prisma.ActionItemWhereInput = {};

    // Role-based filtering
    if (session.user.role === 'AGENT') {
      where.OR = [
        { agentId: session.user.id },
        { assignedTo: session.user.id }
      ];
    } else if (session.user.role === 'TEAM_LEADER') {
      // Get agents supervised by this team leader
      const teamLeaderAgents = await prisma.user.findMany({
        where: { teamLeaderId: session.user.id },
        select: { id: true }
      });
      const agentIds = teamLeaderAgents.map(agent => agent.id);
      
      where.OR = [
        { agentId: { in: agentIds } },
        { createdBy: session.user.id },
        { assignedTo: session.user.id }
      ];
    }
    // Managers can see all action items

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (agentId) where.agentId = agentId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (sessionId) where.sessionId = sessionId;

    // Get total count
    const total = await prisma.actionItem.count({ where });

    // Get action items with pagination
    const actionItems = await prisma.actionItem.findMany({
      where,
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
      orderBy: [
        { status: 'asc' }, // Show pending items first
        { dueDate: 'asc' },
        { priority: 'desc' },
      ],
      skip,
      take: limit,
    });

    const response = {
      actionItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the response
    await setCache(cacheKey, response, CACHE_TTL.SHORT);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching action items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action items' },
      { status: 500 }
    );
  }
}

// POST /api/action-items - Create a new action item
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = actionItemSchema.parse(body);

    // Verify permissions
    if (session.user.role === 'AGENT') {
      // Agents can only create action items for themselves
      if (validatedData.agentId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only create action items for yourself' },
          { status: 403 }
        );
      }
    } else if (session.user.role === 'TEAM_LEADER') {
      // Verify the agent is supervised by this team leader
      const agent = await prisma.user.findUnique({
        where: { id: validatedData.agentId },
        select: { teamLeaderId: true }
      });
      
      if (agent?.teamLeaderId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only create action items for agents you supervise' },
          { status: 403 }
        );
      }
    }

    // Set assignedTo to agentId if not provided
    const assignedTo = validatedData.assignedTo || validatedData.agentId;

    // Create action item
    const actionItem = await prisma.actionItem.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        dueDate: new Date(validatedData.dueDate),
        agentId: validatedData.agentId,
        sessionId: validatedData.sessionId,
        createdBy: session.user.id,
        assignedTo: assignedTo,
        status: 'PENDING',
      },
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
        action: 'CREATE',
        resource: 'ACTION_ITEM',
        resourceId: actionItem.id,
        details: {
          title: actionItem.title,
          priority: actionItem.priority,
          dueDate: actionItem.dueDate,
          agentId: actionItem.agentId,
          assignedTo: actionItem.assignedTo,
        },
      },
    });

    // Create notification for the assigned user
    if (assignedTo !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: assignedTo,
          type: 'ACTION_ITEM_ASSIGNED',
          title: 'New Action Item Assigned',
          message: `You have been assigned a new action item: ${actionItem.title}`,
          data: {
            actionItemId: actionItem.id,
            priority: actionItem.priority,
            dueDate: actionItem.dueDate,
          },
        },
      });
    }

    // Emit socket event for real-time notification
    await notifyActionItemCreated({
      id: actionItem.id,
      agentId: actionItem.agentId,
      agent: actionItem.agent ? {
        teamLeaderId: actionItem.agent.teamLeaderId
      } : undefined
    });

    // Invalidate related caches
    await invalidateAgentCache(actionItem.agentId);
    if (assignedTo !== actionItem.agentId) {
      await invalidateAgentCache(assignedTo);
    }

    return NextResponse.json(actionItem, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('Error creating action item:', error);
    return NextResponse.json(
      { error: 'Failed to create action item' },
      { status: 500 }
    );
  }
}