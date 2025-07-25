import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiService } from '@/lib/ai';
import { z } from 'zod';

const requestSchema = z.object({
  sessionId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = requestSchema.parse(body);

    // Check permissions - only team leaders and managers can generate insights
    if (session.user.role !== 'TEAM_LEADER' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate session insights
    const insights = await aiService.generateSessionInsights(sessionId);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Error generating session insights:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to generate session insights' }, { status: 500 });
  }
}