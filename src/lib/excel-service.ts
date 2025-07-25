import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

interface ExportOptions {
  includeQuickNotes?: boolean;
  includeActionItems?: boolean;
  includeActionPlans?: boolean;
  includeMetrics?: boolean;
  startDate?: Date;
  endDate?: Date;
  agentIds?: string[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

interface MetricRow {
  'Agent Email'?: string;
  'Employee ID'?: string;
  'Month': string | number;
  'Year': string | number;
  'Service': string | number;
  'Productivity': string | number;
  'Quality': string | number;
  'Assiduity': string | number;
  'Performance': string | number;
  'Adherence': string | number;
  'Lateness': string | number;
  'Break Exceeds': string | number;
  'Notes'?: string;
}

export class ExcelService {
  // Export agent metrics to Excel
  async exportAgentMetrics(options: ExportOptions = {}) {
    const workbook = XLSX.utils.book_new();
    
    // Agent Metrics Sheet
    if (options.includeMetrics !== false) {
      const metricsData = await this.getAgentMetricsData(options);
      const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Agent Metrics');
    }

    // Quick Notes Sheet
    if (options.includeQuickNotes) {
      const quickNotesData = await this.getQuickNotesData(options);
      const quickNotesSheet = XLSX.utils.json_to_sheet(quickNotesData);
      XLSX.utils.book_append_sheet(workbook, quickNotesSheet, 'Quick Notes');
    }

    // Action Items Sheet
    if (options.includeActionItems) {
      const actionItemsData = await this.getActionItemsData(options);
      const actionItemsSheet = XLSX.utils.json_to_sheet(actionItemsData);
      XLSX.utils.book_append_sheet(workbook, actionItemsSheet, 'Action Items');
    }

    // Action Plans Sheet
    if (options.includeActionPlans) {
      const actionPlansData = await this.getActionPlansData(options);
      const actionPlansSheet = XLSX.utils.json_to_sheet(actionPlansData);
      XLSX.utils.book_append_sheet(workbook, actionPlansSheet, 'Action Plans');
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  // Import agent metrics from Excel
  async importAgentMetrics(buffer: Buffer): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
    };

    for (const row of data) {
      try {
        await this.importMetricRow(row as MetricRow);
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${result.imported + 1}: ${error}`);
        result.success = false;
      }
    }

    return result;
  }

  // Export coaching sessions to Excel
  async exportCoachingSessions(teamLeaderId?: string, startDate?: Date, endDate?: Date) {
    const sessions = await prisma.coachingSession.findMany({
      where: {
        ...(teamLeaderId && { teamLeaderId }),
        ...(startDate && endDate && {
          sessionDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        agent: {
          include: {
            agentProfile: true,
          },
        },
        teamLeader: true,
        sessionMetrics: true,
      },
      orderBy: {
        sessionDate: 'desc',
      },
    });

    const data = sessions.map(session => ({
      'Session ID': session.id,
      'Agent Name': session.agent.name || session.agent.email,
      'Agent Email': session.agent.email,
      'Employee ID': session.agent.agentProfile?.employeeId || '',
      'Team Leader': session.teamLeader.name || session.teamLeader.email,
      'Session Date': format(new Date(session.sessionDate), 'yyyy-MM-dd HH:mm'),
      'Status': session.status,
      'Duration (min)': session.duration,
      'Previous Score': session.previousScore || '',
      'Current Score': session.currentScore || '',
      'Improvement': session.currentScore && session.previousScore 
        ? (session.currentScore - session.previousScore).toFixed(2) 
        : '',
      'Preparation Notes': session.preparationNotes || '',
      'Session Notes': session.sessionNotes || '',
      'Action Items': session.actionItems || '',
      'Follow-up Date': session.followUpDate 
        ? format(new Date(session.followUpDate), 'yyyy-MM-dd') 
        : '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Coaching Sessions');

    // Add session metrics in a separate sheet
    const metricsData = sessions.flatMap(session => 
      session.sessionMetrics.map(metric => ({
        'Session ID': session.id,
        'Agent Name': session.agent.name || session.agent.email,
        'Session Date': format(new Date(session.sessionDate), 'yyyy-MM-dd'),
        'Metric Name': metric.metricName,
        'Score': metric.score,
        'Comments': metric.comments || '',
      }))
    );

    if (metricsData.length > 0) {
      const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Session Metrics');
    }

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  // Private helper methods
  private async getAgentMetricsData(options: ExportOptions) {
    const metrics = await prisma.agentMetric.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate && options.endDate && {
          createdAt: {
            gte: options.startDate,
            lte: options.endDate,
          },
        }),
      },
      include: {
        agent: {
          include: {
            agentProfile: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return metrics.map(metric => ({
      'Agent Name': metric.agent.name || metric.agent.email,
      'Employee ID': metric.agent.agentProfile?.employeeId || '',
      'Month': metric.month,
      'Year': metric.year,
      'Service': metric.service,
      'Productivity': metric.productivity,
      'Quality': metric.quality,
      'Assiduity': metric.assiduity,
      'Performance': metric.performance,
      'Adherence': metric.adherence,
      'Lateness': metric.lateness,
      'Break Exceeds': metric.breakExceeds,
      'Total Score': metric.totalScore?.toFixed(2) || '',
      'Percentage': metric.percentage?.toFixed(2) || '',
      'Notes': metric.notes || '',
    }));
  }

  private async getQuickNotesData(options: ExportOptions) {
    const quickNotes = await prisma.quickNote.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate && options.endDate && {
          createdAt: {
            gte: options.startDate,
            lte: options.endDate,
          },
        }),
      },
      include: {
        agent: {
          include: {
            agentProfile: true,
          },
        },
        author: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return quickNotes.map(note => ({
      'Agent Name': note.agent.name || note.agent.email,
      'Employee ID': note.agent.agentProfile?.employeeId || '',
      'Category': note.category,
      'Content': note.content,
      'Author': note.author.name || note.author.email,
      'Private': note.isPrivate ? 'Yes' : 'No',
      'Created Date': format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm'),
    }));
  }

  private async getActionItemsData(options: ExportOptions) {
    const actionItems = await prisma.actionItem.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate && options.endDate && {
          createdAt: {
            gte: options.startDate,
            lte: options.endDate,
          },
        }),
      },
      include: {
        agent: {
          include: {
            agentProfile: true,
          },
        },
        creator: true,
        assignee: true,
        session: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return actionItems.map(item => ({
      'Agent Name': item.agent.name || item.agent.email,
      'Employee ID': item.agent.agentProfile?.employeeId || '',
      'Title': item.title,
      'Description': item.description,
      'Priority': item.priority,
      'Status': item.status,
      'Due Date': format(new Date(item.dueDate), 'yyyy-MM-dd'),
      'Completed Date': item.completedDate 
        ? format(new Date(item.completedDate), 'yyyy-MM-dd') 
        : '',
      'Created By': item.creator.name || item.creator.email,
      'Assigned To': item.assignee.name || item.assignee.email,
      'Session ID': item.sessionId || '',
      'Created Date': format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm'),
    }));
  }

  private async getActionPlansData(options: ExportOptions) {
    const actionPlans = await prisma.actionPlan.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate && options.endDate && {
          createdAt: {
            gte: options.startDate,
            lte: options.endDate,
          },
        }),
      },
      include: {
        agent: {
          include: {
            agentProfile: true,
          },
        },
        creator: true,
        approver: true,
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const plansData = actionPlans.map(plan => ({
      'Plan ID': plan.id,
      'Agent Name': plan.agent.name || plan.agent.email,
      'Employee ID': plan.agent.agentProfile?.employeeId || '',
      'Title': plan.title,
      'Description': plan.description,
      'Status': plan.status,
      'Start Date': format(new Date(plan.startDate), 'yyyy-MM-dd'),
      'End Date': format(new Date(plan.endDate), 'yyyy-MM-dd'),
      'Created By': plan.creator.name || plan.creator.email,
      'Approved By': plan.approver?.name || plan.approver?.email || '',
      'Approved Date': plan.approvedAt 
        ? format(new Date(plan.approvedAt), 'yyyy-MM-dd') 
        : '',
      'Total Items': plan.items.length,
      'Completed Items': plan.items.filter(i => i.status === 'COMPLETED').length,
      'Created Date': format(new Date(plan.createdAt), 'yyyy-MM-dd HH:mm'),
    }));

    // Create a separate sheet for action plan items
    const itemsData = actionPlans.flatMap(plan => 
      plan.items.map(item => ({
        'Plan ID': plan.id,
        'Agent Name': plan.agent.name || plan.agent.email,
        'Plan Title': plan.title,
        'Item Title': item.title,
        'Item Description': item.description,
        'Target Metric': item.targetMetric,
        'Target Value': item.targetValue,
        'Current Value': item.currentValue || '',
        'Status': item.status,
        'Due Date': format(new Date(item.dueDate), 'yyyy-MM-dd'),
        'Completed Date': item.completedDate 
          ? format(new Date(item.completedDate), 'yyyy-MM-dd') 
          : '',
      }))
    );

    const workbook = XLSX.utils.book_new();
    const plansSheet = XLSX.utils.json_to_sheet(plansData);
    XLSX.utils.book_append_sheet(workbook, plansSheet, 'Action Plans');

    if (itemsData.length > 0) {
      const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Action Plan Items');
    }

    return plansData;
  }

  private async importMetricRow(row: MetricRow) {
    // Find agent by email or employee ID
    const agent = await prisma.user.findFirst({
      where: {
        OR: [
          { email: row['Agent Email'] },
          { agentProfile: { employeeId: row['Employee ID'] } },
        ],
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Calculate total score and percentage
    const metrics = {
      service: parseFloat(String(row['Service'])) || 0,
      productivity: parseFloat(String(row['Productivity'])) || 0,
      quality: parseFloat(String(row['Quality'])) || 0,
      assiduity: parseFloat(String(row['Assiduity'])) || 0,
      performance: parseFloat(String(row['Performance'])) || 0,
      adherence: parseFloat(String(row['Adherence'])) || 0,
      lateness: parseFloat(String(row['Lateness'])) || 0,
      breakExceeds: parseFloat(String(row['Break Exceeds'])) || 0,
    };

    const weights = {
      serviceWeight: 1,
      productivityWeight: 1,
      qualityWeight: 1,
      assiduityWeight: 1,
      performanceWeight: 1,
      adherenceWeight: 1,
      latenessWeight: 1,
      breakExceedsWeight: 1,
    };

    const totalScore = Object.entries(metrics).reduce((sum, [key, value]) => {
      const weightKey = `${key}Weight` as keyof typeof weights;
      return sum + (value * weights[weightKey]);
    }, 0);

    const maxScore = Object.values(weights).reduce((sum, weight) => sum + (100 * weight), 0);
    const percentage = (totalScore / maxScore) * 100;

    await prisma.agentMetric.upsert({
      where: {
        agentId_month_year: {
          agentId: agent.id,
          month: parseInt(String(row['Month'])),
          year: parseInt(String(row['Year'])),
        },
      },
      update: {
        ...metrics,
        ...weights,
        totalScore,
        percentage,
        notes: row['Notes'] || null,
      },
      create: {
        agentId: agent.id,
        month: parseInt(String(row['Month'])),
        year: parseInt(String(row['Year'])),
        ...metrics,
        ...weights,
        totalScore,
        percentage,
        notes: row['Notes'] || null,
      },
    });
  }
}

export const excelService = new ExcelService();