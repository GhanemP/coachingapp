import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiService } from '@/lib/ai';
import { z } from 'zod';

const requestSchema = z.object({
  agentId: z.string(),
  timeframe: z.enum(['week', 'month', 'quarter']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, timeframe = 'month' } = requestSchema.parse(body);

    // Check permissions - only team leaders and managers can generate summaries
    if (session.user.role !== 'TEAM_LEADER' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate performance summary
    const summary = await aiService.generatePerformanceSummary(agentId, timeframe);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating performance summary:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to generate performance summary' }, { status: 500 });
  }
}