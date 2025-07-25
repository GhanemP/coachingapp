import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { excelService } from '@/lib/excel-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only team leaders, managers, and admins can export sessions
    if (!['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teamLeaderId = searchParams.get('teamLeaderId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Team leaders can only export their own sessions
    const exportTeamLeaderId = session.user.role === 'TEAM_LEADER' 
      ? session.user.id 
      : teamLeaderId || undefined;

    const buffer = await excelService.exportCoachingSessions(
      exportTeamLeaderId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="coaching-sessions-${new Date().toISOString().split('T')[0]}.xlsx"`);

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error('Error exporting sessions:', error);
    return NextResponse.json(
      { error: 'Failed to export sessions' },
      { status: 500 }
    );
  }
}