import { format } from 'date-fns';
import ExcelJS from 'exceljs';

import {
  calculateTotalScore,
  validateMetricScore,
  roundToDecimals,
  METRIC_SCALE,
} from '@/lib/calculation-utils';
import { prisma } from '@/lib/prisma';

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
  Month: string | number;
  Year: string | number;
  Service: string | number;
  Productivity: string | number;
  Quality: string | number;
  Assiduity: string | number;
  Performance: string | number;
  Adherence: string | number;
  Lateness: string | number;
  'Break Exceeds': string | number;
  Notes?: string;
}

export class ExcelService {
  // Export agent metrics to Excel
  async exportAgentMetrics(options: ExportOptions = {}) {
    const workbook = new ExcelJS.Workbook();

    // Agent Metrics Sheet
    if (options.includeMetrics !== false) {
      const metricsData = await this.getAgentMetricsData(options);
      const metricsSheet = workbook.addWorksheet('Agent Metrics');

      // Add headers
      if (metricsData.length > 0) {
        metricsSheet.columns = Object.keys(metricsData[0]).map(key => ({
          header: key,
          key: key,
          width: 15,
        }));

        // Add data
        metricsData.forEach(row => {
          metricsSheet.addRow(row);
        });
      }
    }

    // Quick Notes Sheet
    if (options.includeQuickNotes) {
      const quickNotesData = await this.getQuickNotesData(options);
      const quickNotesSheet = workbook.addWorksheet('Quick Notes');

      if (quickNotesData.length > 0) {
        quickNotesSheet.columns = Object.keys(quickNotesData[0]).map(key => ({
          header: key,
          key: key,
          width: 20,
        }));

        quickNotesData.forEach(row => {
          quickNotesSheet.addRow(row);
        });
      }
    }

    // Action Items Sheet
    if (options.includeActionItems) {
      const actionItemsData = await this.getActionItemsData(options);
      const actionItemsSheet = workbook.addWorksheet('Action Items');

      if (actionItemsData.length > 0) {
        actionItemsSheet.columns = Object.keys(actionItemsData[0]).map(key => ({
          header: key,
          key: key,
          width: 20,
        }));

        actionItemsData.forEach(row => {
          actionItemsSheet.addRow(row);
        });
      }
    }

    // Action Plans Sheet
    if (options.includeActionPlans) {
      const actionPlansData = await this.getActionPlansData(options);
      const actionPlansSheet = workbook.addWorksheet('Action Plans');

      if (actionPlansData.length > 0) {
        actionPlansSheet.columns = Object.keys(actionPlansData[0]).map(key => ({
          header: key,
          key: key,
          width: 20,
        }));

        actionPlansData.forEach(row => {
          actionPlansSheet.addRow(row);
        });
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  // Import agent metrics from Excel
  async importAgentMetrics(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const worksheet = workbook.worksheets[0];
    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
    };

    if (!worksheet) {
      result.success = false;
      result.errors.push('No worksheet found in the Excel file');
      return result;
    }

    const importPromises: Promise<void>[] = [];

    // Process rows (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      } // Skip header

      try {
        const rowData: Partial<MetricRow> = {};

        // Map columns to object properties
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          const header = cell.value?.toString() || '';
          const value = row.getCell(colNumber).value;
          if (header && value !== undefined && value !== null) {
            rowData[header as keyof MetricRow] = value.toString();
          }
        });

        // Validate required fields
        if (rowData['Month'] && rowData['Year']) {
          // Import the row
          const importPromise = this.importMetricRow(rowData as MetricRow)
            .then(() => {
              result.imported++;
            })
            .catch(error => {
              result.errors.push(`Row ${rowNumber}: ${error}`);
              result.success = false;
            });

          importPromises.push(importPromise);
        } else {
          result.errors.push(`Row ${rowNumber}: Missing required fields (Month/Year)`);
          result.success = false;
        }
      } catch (error) {
        result.errors.push(`Row ${rowNumber}: ${error}`);
        result.success = false;
      }
    });

    // Wait for all imports to complete
    await Promise.all(importPromises);

    return result;
  }

  // Export coaching sessions to Excel
  async exportCoachingSessions(teamLeaderId?: string, startDate?: Date, endDate?: Date) {
    const sessions = await prisma.coachingSession.findMany({
      where: {
        ...(teamLeaderId && { teamLeaderId }),
        ...(startDate &&
          endDate && {
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
      Status: session.status,
      'Duration (min)': session.duration,
      'Previous Score': session.previousScore || '',
      'Current Score': session.currentScore || '',
      Improvement:
        session.currentScore && session.previousScore
          ? (session.currentScore - session.previousScore).toFixed(2)
          : '',
      'Preparation Notes': session.preparationNotes || '',
      'Session Notes': session.sessionNotes || '',
      'Action Items': session.actionItems || '',
      'Follow-up Date': session.followUpDate
        ? format(new Date(session.followUpDate), 'yyyy-MM-dd')
        : '',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Coaching Sessions');

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: 20,
      }));

      data.forEach(row => {
        worksheet.addRow(row);
      });
    }

    // Add session metrics in a separate sheet
    const metricsData = sessions.flatMap(session =>
      session.sessionMetrics.map(metric => ({
        'Session ID': session.id,
        'Agent Name': session.agent.name || session.agent.email,
        'Session Date': format(new Date(session.sessionDate), 'yyyy-MM-dd'),
        'Metric Name': metric.metricName,
        Score: metric.score,
        Comments: metric.comments || '',
      }))
    );

    if (metricsData.length > 0) {
      const metricsSheet = workbook.addWorksheet('Session Metrics');
      metricsSheet.columns = Object.keys(metricsData[0]).map(key => ({
        header: key,
        key: key,
        width: 20,
      }));

      metricsData.forEach(row => {
        metricsSheet.addRow(row);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  // Private helper methods
  private async getAgentMetricsData(options: ExportOptions) {
    const metrics = await prisma.agentMetric.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate &&
          options.endDate && {
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
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return metrics.map(metric => ({
      'Agent Name': metric.agent.name || metric.agent.email,
      'Employee ID': metric.agent.agentProfile?.employeeId || '',
      Month: metric.month,
      Year: metric.year,
      Service: metric.service,
      Productivity: metric.productivity,
      Quality: metric.quality,
      Assiduity: metric.assiduity,
      Performance: metric.performance,
      Adherence: metric.adherence,
      Lateness: metric.lateness,
      'Break Exceeds': metric.breakExceeds,
      'Total Score': metric.totalScore?.toFixed(2) || '',
      Percentage: metric.percentage?.toFixed(2) || '',
      Notes: metric.notes || '',
    }));
  }

  private async getQuickNotesData(options: ExportOptions) {
    const quickNotes = await prisma.quickNote.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate &&
          options.endDate && {
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
      Category: note.category,
      Content: note.content,
      Author: note.author.name || note.author.email,
      Private: note.isPrivate ? 'Yes' : 'No',
      'Created Date': format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm'),
    }));
  }

  private async getActionItemsData(options: ExportOptions) {
    const actionItems = await prisma.actionItem.findMany({
      where: {
        ...(options.agentIds && { agentId: { in: options.agentIds } }),
        ...(options.startDate &&
          options.endDate && {
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
      Title: item.title,
      Description: item.description,
      Priority: item.priority,
      Status: item.status,
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
        ...(options.startDate &&
          options.endDate && {
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
      Title: plan.title,
      Description: plan.description,
      Status: plan.status,
      'Start Date': format(new Date(plan.startDate), 'yyyy-MM-dd'),
      'End Date': format(new Date(plan.endDate), 'yyyy-MM-dd'),
      'Created By': plan.creator.name || plan.creator.email,
      'Approved By': plan.approver?.name || plan.approver?.email || '',
      'Approved Date': plan.approvedAt ? format(new Date(plan.approvedAt), 'yyyy-MM-dd') : '',
      'Total Items': plan.items.length,
      'Completed Items': plan.items.filter(i => i.status === 'COMPLETED').length,
      'Created Date': format(new Date(plan.createdAt), 'yyyy-MM-dd HH:mm'),
    }));

    return plansData;
  }

  private async importMetricRow(row: MetricRow) {
    // Find agent by email or employee ID
    const agent = await prisma.user.findFirst({
      where: {
        OR: [{ email: row['Agent Email'] }, { agentProfile: { employeeId: row['Employee ID'] } }],
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Parse and validate metrics
    const metrics = {
      service: validateMetricScore(parseFloat(String(row['Service'])) || METRIC_SCALE.MIN),
      productivity: validateMetricScore(
        parseFloat(String(row['Productivity'])) || METRIC_SCALE.MIN
      ),
      quality: validateMetricScore(parseFloat(String(row['Quality'])) || METRIC_SCALE.MIN),
      assiduity: validateMetricScore(parseFloat(String(row['Assiduity'])) || METRIC_SCALE.MIN),
      performance: validateMetricScore(parseFloat(String(row['Performance'])) || METRIC_SCALE.MIN),
      adherence: validateMetricScore(parseFloat(String(row['Adherence'])) || METRIC_SCALE.MIN),
      lateness: validateMetricScore(parseFloat(String(row['Lateness'])) || METRIC_SCALE.MIN),
      breakExceeds: validateMetricScore(
        parseFloat(String(row['Break Exceeds'])) || METRIC_SCALE.MIN
      ),
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

    // Calculate total score using the utility function
    const metricsArray = [
      { score: metrics.service, weight: weights.serviceWeight },
      { score: metrics.productivity, weight: weights.productivityWeight },
      { score: metrics.quality, weight: weights.qualityWeight },
      { score: metrics.assiduity, weight: weights.assiduityWeight },
      { score: metrics.performance, weight: weights.performanceWeight },
      { score: metrics.adherence, weight: weights.adherenceWeight },
      { score: metrics.lateness, weight: weights.latenessWeight },
      { score: metrics.breakExceeds, weight: weights.breakExceedsWeight },
    ];

    const { totalScore, percentage } = calculateTotalScore(metricsArray);

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
        totalScore: roundToDecimals(totalScore, 2),
        percentage: roundToDecimals(percentage, 2),
        notes: row['Notes'] || null,
      },
      create: {
        agentId: agent.id,
        month: parseInt(String(row['Month'])),
        year: parseInt(String(row['Year'])),
        ...metrics,
        ...weights,
        totalScore: roundToDecimals(totalScore, 2),
        percentage: roundToDecimals(percentage, 2),
        notes: row['Notes'] || null,
        // Add new required fields with default values
        scheduleAdherence: 0,
        attendanceRate: 0,
        punctualityScore: 0,
        breakCompliance: 0,
        taskCompletionRate: 0,
        productivityIndex: 0,
        qualityScore: 0,
        efficiencyRate: 0,
      },
    });
  }
}

export const excelService = new ExcelService();
