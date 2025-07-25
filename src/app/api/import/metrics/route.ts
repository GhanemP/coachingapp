import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { ExcelService } from '@/lib/excel.service';
import { UserRole } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, errors } = await ExcelService.parseMetricsFile(buffer);
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation errors found', 
        details: errors 
      }, { status: 400 });
    }
    
    // Process valid data
    const results = await Promise.allSettled(
      data.map(async (row) => {
        // Find agent by employee ID
        const agent = await prisma.agent.findFirst({
          where: { employeeId: row.employeeId }
        });
        
        if (!agent) {
          throw new Error(`Agent with employee ID ${row.employeeId} not found`);
        }
        
        // Calculate scores
        const defaultWeights = {
          serviceWeight: 1,
          productivityWeight: 1,
          qualityWeight: 1,
          assiduityWeight: 1,
          performanceWeight: 1,
          adherenceWeight: 1,
          latenessWeight: 1,
          breakExceedsWeight: 1,
        };
        
        const weights = await prisma.metricWeight.findFirst({
          where: { isDefault: true }
        });
        
        const effectiveWeights = weights || defaultWeights;
        
        // Extract weight values
        const weightValues = [
          effectiveWeights?.serviceWeight,
          effectiveWeights?.productivityWeight,
          effectiveWeights?.qualityWeight,
          effectiveWeights?.assiduityWeight,
          effectiveWeights?.performanceWeight,
          effectiveWeights?.adherenceWeight,
          effectiveWeights?.latenessWeight,
          effectiveWeights?.breakExceedsWeight
        ];
        
        const totalScore =
          row.service * effectiveWeights.serviceWeight +
          row.productivity * effectiveWeights.productivityWeight +
          row.quality * effectiveWeights.qualityWeight +
          row.assiduity * effectiveWeights.assiduityWeight +
          row.performance * effectiveWeights.performanceWeight +
          row.adherence * effectiveWeights.adherenceWeight +
          row.lateness * effectiveWeights.latenessWeight +
          row.breakExceeds * effectiveWeights.breakExceedsWeight;
        
        const maxScore = 5 * weightValues.reduce((sum, weight) => sum + weight, 0);
        const percentage = (totalScore / maxScore) * 100;
        
        // Upsert metric
        return await prisma.agentMetric.upsert({
          where: {
            agentId_month_year: {
              agentId: agent.userId,
              month: row.month,
              year: row.year
            }
          },
          update: {
            ...row,
            totalScore,
            percentage,
            updatedAt: new Date()
          },
          create: {
            agentId: agent.userId,
            ...row,
            totalScore,
            percentage
          }
        });
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return NextResponse.json({
      message: `Import completed. ${successful} records imported, ${failed} failed.`,
      details: results.map((r, i) => ({
        row: i + 2,
        status: r.status,
        error: r.status === 'rejected' ? (r.reason as Error).message : null
      }))
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import metrics' },
      { status: 500 }
    );
  }
}