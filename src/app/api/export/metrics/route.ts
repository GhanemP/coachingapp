import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { excelService } from '@/lib/excel-service';
import logger from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only team leaders, managers, and admins can export metrics
    if (!['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeQuickNotes = searchParams.get('includeQuickNotes') === 'true';
    const includeActionItems = searchParams.get('includeActionItems') === 'true';
    const includeActionPlans = searchParams.get('includeActionPlans') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const agentIds = searchParams.get('agentIds')?.split(',').filter(Boolean);

    const options = {
      includeQuickNotes,
      includeActionItems,
      includeActionPlans,
      includeMetrics: true,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(agentIds && { agentIds }),
    };

    const buffer = await excelService.exportAgentMetrics(options);

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="agent-metrics-${new Date().toISOString().split('T')[0]}.xlsx"`);

    return new NextResponse(buffer, { headers });
  } catch (error) {
    logger.error('Error exporting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to export metrics' },
      { status: 500 }
    );
  }
}