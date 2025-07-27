import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';

// Schema for creating an action plan
const createActionPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  agentId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  items: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    targetMetric: z.string().min(1),
    targetValue: z.number(),
    dueDate: z.string().datetime(),
  })).min(1),
});

// GET /api/action-plans - List action plans
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const agentId = searchParams.get('agentId');
    const sessionId = searchParams.get('sessionId');

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    interface WhereClause {
      status?: string;
      sessionId?: string;
      agentId?: string | { in: string[] };
    }
    const where: WhereClause = {};

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Filter by session if provided
    if (sessionId) {
      where.sessionId = sessionId;
    }

    // Role-based filtering
    if (session.user.role === UserRole.AGENT) {
      where.agentId = session.user.id;
    } else if (session.user.role === UserRole.TEAM_LEADER) {
      // Team leaders can see plans for their agents
      const teamLeaderAgents = await prisma.user.findMany({
        where: {
          teamLeaderId: session.user.id,
          role: UserRole.AGENT,
        },
        select: { id: true },
      });
      const agentIds = teamLeaderAgents.map(agent => agent.id);
      
      if (agentId && agentIds.includes(agentId)) {
        where.agentId = agentId;
      } else if (!agentId) {
        where.agentId = { in: agentIds };
      } else {
        // Requested agent not under this team leader
        return NextResponse.json({ 
          actionPlans: [], 
          pagination: { page, limit, total: 0, totalPages: 0 } 
        });
      }
    } else if (session.user.role === UserRole.MANAGER || session.user.role === UserRole.ADMIN) {
      // Managers and admins can see all plans
      if (agentId) {
        where.agentId = agentId;
      }
    }

    // Get total count
    const total = await prisma.actionPlan.count({ where });

    // Get action plans with related data
    const actionPlans = await prisma.actionPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
        items: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    // Calculate completion percentage for each plan
    const plansWithProgress = actionPlans.map(plan => {
      const totalItems = plan.items.length;
      const completedItems = plan.items.filter((item: { status: string }) => item.status === 'COMPLETED').length;
      const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...plan,
        completionPercentage,
        totalItems,
        completedItems,
      };
    });

    return NextResponse.json({
      actionPlans: plansWithProgress,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching action plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action plans' },
      { status: 500 }
    );
  }
}

// POST /api/action-plans - Create a new action plan
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only team leaders, managers, and admins can create action plans
    if (session.user.role === UserRole.AGENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createActionPlanSchema.parse(body);

    // Verify the agent exists and the user has permission
    const agent = await prisma.user.findUnique({
      where: { id: validatedData.agentId },
      select: { 
        id: true, 
        role: true,
        teamLeaderId: true,
      },
    });

    if (!agent || agent.role !== UserRole.AGENT) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check permission based on role
    if (session.user.role === UserRole.TEAM_LEADER && agent.teamLeaderId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    // Create the action plan with items
    const actionPlan = await prisma.actionPlan.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        agentId: validatedData.agentId,
        createdBy: session.user.id,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        status: 'ACTIVE',
        items: {
          create: validatedData.items.map(item => ({
            title: item.title,
            description: item.description,
            targetMetric: item.targetMetric,
            targetValue: item.targetValue,
            dueDate: new Date(item.dueDate),
            status: 'PENDING',
          })),
        },
      },
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
        items: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'ACTION_PLAN',
        resourceId: actionPlan.id,
        details: {
          title: actionPlan.title,
          agentId: actionPlan.agentId,
          itemCount: validatedData.items.length,
        },
      },
    });

    // Create notification for the agent
    await prisma.notification.create({
      data: {
        userId: validatedData.agentId,
        type: 'ACTION_PLAN_CREATED',
        title: 'New Action Plan Created',
        message: `A new action plan "${actionPlan.title}" has been created for you with ${validatedData.items.length} items.`,
        data: {
          actionPlanId: actionPlan.id,
          type: 'ACTION_PLAN',
        },
      },
    });

    return NextResponse.json(actionPlan, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error creating action plan:', error);
    return NextResponse.json(
      { error: 'Failed to create action plan' },
      { status: 500 }
    );
  }
}