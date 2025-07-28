import { Prisma, ActionItem } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, invalidateAgentCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';
import { notifyActionItemCreated } from '@/lib/socket-helpers';

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

/**
 * @swagger
 * /api/action-items:
 *   get:
 *     summary: Get action items
 *     description: Retrieve action items with optional filtering by agent, status, and priority. Supports pagination and search.
 *     tags:
 *       - Action Items
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - name: priority
 *         in: query
 *         description: Filter by priority
 *         required: false
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - name: agentId
 *         in: query
 *         description: Filter by agent ID
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: assignedTo
 *         in: query
 *         description: Filter by assigned user ID
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: sessionId
 *         in: query
 *         description: Filter by coaching session ID
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Action items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actionItems:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ActionItem'
 *                       - type: object
 *                         properties:
 *                           agent:
 *                             $ref: '#/components/schemas/User'
 *                           creator:
 *                             $ref: '#/components/schemas/User'
 *                           assignee:
 *                             $ref: '#/components/schemas/User'
 *                           session:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               sessionDate:
 *                                 type: string
 *                                 format: date-time
 *                               status:
 *                                 type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
    if (status) {where.status = status;}
    if (priority) {where.priority = priority;}
    
    // Handle agentId filter with role-based validation
    if (agentId) {
      if (session.user.role === 'TEAM_LEADER') {
        // For team leaders, ensure the selected agent is supervised by them
        const teamLeaderAgents = await prisma.user.findMany({
          where: { teamLeaderId: session.user.id },
          select: { id: true }
        });
        const supervisedAgentIds = teamLeaderAgents.map(agent => agent.id);
        
        // Only apply agentId filter if the agent is supervised by this team leader
        if (supervisedAgentIds.includes(agentId)) {
          // Combine with existing role-based filtering
          where.AND = [
            { OR: where.OR }, // Keep the existing team leader filtering
            { agentId: agentId } // Add the specific agent filter
          ];
          delete where.OR; // Remove the OR clause since we're using AND now
        }
        // If agent is not supervised, the existing role-based filtering will handle it
      } else {
        // For other roles, apply agentId filter normally
        where.agentId = agentId;
      }
    }
    
    if (assignedTo) {where.assignedTo = assignedTo;}
    if (sessionId) {where.sessionId = sessionId;}

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
    logger.error('Error fetching action items:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch action items' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/action-items:
 *   post:
 *     summary: Create a new action item
 *     description: Create a new action item for an agent. Requires team leader, manager, or admin privileges.
 *     tags:
 *       - Action Items
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - priority
 *               - dueDate
 *               - agentId
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: Title of the action item
 *                 example: "Improve call handling time"
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 description: Detailed description of the action item
 *                 example: "Focus on reducing average call handling time by 15%"
 *               priority:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *                 description: Priority level of the action item
 *                 example: "HIGH"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date for completion
 *                 example: "2024-02-01T00:00:00.000Z"
 *               agentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the agent this action item is for
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional coaching session ID this action item relates to
 *               assignedTo:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user assigned to track this action item (defaults to agentId)
 *     responses:
 *       201:
 *         description: Action item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ActionItem'
 *                 - type: object
 *                   properties:
 *                     agent:
 *                       $ref: '#/components/schemas/User'
 *                     creator:
 *                       $ref: '#/components/schemas/User'
 *                     assignee:
 *                       $ref: '#/components/schemas/User'
 *                     session:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         sessionDate:
 *                           type: string
 *                           format: date-time
 *                         status:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
    logger.error('Error creating action item:', error as Error);
    return NextResponse.json(
      { error: 'Failed to create action item' },
      { status: 500 }
    );
  }
}