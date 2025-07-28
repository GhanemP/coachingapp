import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
// import { prisma } from '@/lib/prisma'; // Unused import
import { UserRole } from '@/lib/constants';
import { excelService } from '@/lib/excel-service';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      // Use the Excel service to import metrics
      const result = await excelService.importAgentMetrics(buffer);

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Import failed',
            details: result.errors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: `Import completed successfully. ${result.imported} records imported.`,
        imported: result.imported,
        errors: result.errors,
      });
    } catch (parseError) {
      logger.error('Excel parsing error:', parseError instanceof Error ? parseError : undefined);
      return NextResponse.json(
        {
          error: 'Failed to parse Excel file',
          details: parseError instanceof Error ? parseError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Import error:', error as Error);
    return NextResponse.json({ error: 'Failed to import metrics' }, { status: 500 });
  }
}

// GET endpoint to download template
export async function GET() {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use excelService to create the template
    const buffer = await excelService.exportAgentMetrics({
      includeMetrics: true,
      agentIds: [], // Empty to create template
    });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="metrics-import-template.xlsx"',
      },
    });
  } catch (error) {
    logger.error('Template generation error:', error as Error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
