import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiService } from '@/lib/ai';
import { z } from 'zod';

const requestSchema = z.object({
  sessionId: z.string(),
  count: z.number().min(1).max(10).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, count = 5 } = requestSchema.parse(body);

    // Check permissions - only team leaders and managers can generate suggestions
    if (session.user.role !== 'TEAM_LEADER' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate action item suggestions
    const suggestions = await aiService.suggestActionItems(sessionId, count);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error suggesting action items:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to suggest action items' }, { status: 500 });
  }
}