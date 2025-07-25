import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, QuickNote } from '@prisma/client';
import { notifyQuickNoteCreated } from '@/lib/socket-helpers';
import { getCache, setCache, invalidateAgentCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';

// Type for cached response
interface QuickNotesResponse {
  quickNotes: (QuickNote & {
    agent: {
      id: string;
      name: string;
    };
    createdBy: {
      id: string;
      name: string | null;
    };
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Validation schema for quick note
const quickNoteSchema = z.object({
  content: z.string().min(1).max(500),
  category: z.enum(['PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'OTHER']),
  agentId: z.string(),
  isPrivate: z.boolean().optional().default(false),
});

// GET /api/quick-notes - Get all quick notes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const agentId = searchParams.get('agentId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.QUICK_NOTES}${session.user.id}:${category || 'all'}:${agentId || 'all'}:${search || 'none'}:${page}:${limit}`;
    const cachedData = await getCache<QuickNotesResponse>(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Build where clause based on user role
    const where: Prisma.QuickNoteWhereInput = {};

    // If user is an agent, they can only see their own notes or public notes
    if (session.user.role === 'AGENT') {
      where.OR = [
        { agentId: session.user.id },
        { authorId: session.user.id },
        { isPrivate: false, agentId: session.user.id }
      ];
    } else if (session.user.role === 'TEAM_LEADER') {
      // Team leaders can see notes for agents they supervise
      const teamLeaderAgents = await prisma.user.findMany({
        where: { teamLeaderId: session.user.id },
        select: { id: true }
      });
      const agentIds = teamLeaderAgents.map(agent => agent.id);
      
      where.OR = [
        { authorId: session.user.id },
        { agentId: { in: agentIds } }
      ];
    }
    // Managers can see all notes (no additional where clause needed)

    if (category) where.category = category;
    if (agentId) where.agentId = agentId;
    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }

    // Get total count
    const total = await prisma.quickNote.count({ where });

    // Get quick notes with pagination
    const quickNotes = await prisma.quickNote.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const response = {
      quickNotes,
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
    console.error('Error fetching quick notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick notes' },
      { status: 500 }
    );
  }
}

// POST /api/quick-notes - Create a new quick note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = quickNoteSchema.parse(body);

    // Verify the user has permission to create notes for this agent
    if (session.user.role === 'AGENT' && validatedData.agentId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only create notes for yourself' },
        { status: 403 }
      );
    }

    if (session.user.role === 'TEAM_LEADER') {
      // Verify the agent is supervised by this team leader
      const agent = await prisma.user.findUnique({
        where: { id: validatedData.agentId },
        select: { teamLeaderId: true }
      });
      
      if (agent?.teamLeaderId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only create notes for agents you supervise' },
          { status: 403 }
        );
      }
    }

    // Create quick note
    const quickNote = await prisma.quickNote.create({
      data: {
        ...validatedData,
        authorId: session.user.id,
      },
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
        action: 'CREATE',
        resource: 'QUICK_NOTE',
        resourceId: quickNote.id,
        details: {
          content: quickNote.content,
          category: quickNote.category,
          agentId: quickNote.agentId,
          isPrivate: quickNote.isPrivate,
        },
      },
    });

    // Emit socket event for real-time notification
    await notifyQuickNoteCreated({
      id: quickNote.id,
      agentId: quickNote.agentId,
      createdBy: {
        name: quickNote.author.name
      }
    });

    // Invalidate related caches
    await invalidateAgentCache(quickNote.agentId);

    return NextResponse.json(quickNote, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating quick note:', error);
    return NextResponse.json(
      { error: 'Failed to create quick note' },
      { status: 500 }
    );
  }
}