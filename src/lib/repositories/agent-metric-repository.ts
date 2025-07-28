import { AgentMetric } from '@prisma/client';

import { prisma } from '../prisma';

export interface AgentMetricCreateInput {
  agentId: string;
  month: number;
  year: number;
  scheduleAdherence: number;
  attendanceRate: number;
  punctualityScore: number;
  breakCompliance: number;
  taskCompletionRate: number;
  productivityIndex: number;
  qualityScore: number;
  efficiencyRate: number;
  scheduledHours?: number;
  actualHours?: number;
  scheduledDays?: number;
  daysPresent?: number;
  totalShifts?: number;
  onTimeArrivals?: number;
  totalBreaks?: number;
  breaksWithinLimit?: number;
  tasksAssigned?: number;
  tasksCompleted?: number;
  expectedOutput?: number;
  actualOutput?: number;
  totalTasks?: number;
  errorFreeTasks?: number;
  standardTime?: number;
  actualTimeSpent?: number;
  notes?: string;
}

export interface AgentMetricUpdateInput {
  scheduleAdherence?: number;
  attendanceRate?: number;
  punctualityScore?: number;
  breakCompliance?: number;
  taskCompletionRate?: number;
  productivityIndex?: number;
  qualityScore?: number;
  efficiencyRate?: number;
  scheduledHours?: number;
  actualHours?: number;
  scheduledDays?: number;
  daysPresent?: number;
  totalShifts?: number;
  onTimeArrivals?: number;
  totalBreaks?: number;
  breaksWithinLimit?: number;
  tasksAssigned?: number;
  tasksCompleted?: number;
  expectedOutput?: number;
  actualOutput?: number;
  totalTasks?: number;
  errorFreeTasks?: number;
  standardTime?: number;
  actualTimeSpent?: number;
  notes?: string;
}

export interface AgentMetricFilters {
  agentId?: string;
  month?: number;
  year?: number;
  yearRange?: { start: number; end: number };
}

export class AgentMetricRepository {
  private handleError(operation: string, error: unknown): void {
    console.error(`AgentMetricRepository error in ${operation}:`, error);
  }

  async findById(id: string): Promise<AgentMetric | null> {
    try {
      return await prisma.agentMetric.findUnique({
        where: { id },
      });
    } catch (error) {
      this.handleError('findById', error);
      throw error;
    }
  }

  async findByAgentAndPeriod(
    agentId: string,
    month: number,
    year: number
  ): Promise<AgentMetric | null> {
    try {
      return await prisma.agentMetric.findUnique({
        where: {
          agentId_month_year: {
            agentId,
            month,
            year,
          },
        },
      });
    } catch (error) {
      this.handleError('findByAgentAndPeriod', error);
      throw error;
    }
  }

  async findByAgent(agentId: string): Promise<AgentMetric[]> {
    try {
      return await prisma.agentMetric.findMany({
        where: { agentId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    } catch (error) {
      this.handleError('findByAgent', error);
      throw error;
    }
  }

  async findByPeriod(month: number, year: number): Promise<AgentMetric[]> {
    try {
      return await prisma.agentMetric.findMany({
        where: { month, year },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError('findByPeriod', error);
      throw error;
    }
  }

  async findMany(filters?: AgentMetricFilters): Promise<AgentMetric[]> {
    try {
      const where: Record<string, unknown> = {};

      if (filters?.agentId) {
        where.agentId = filters.agentId;
      }
      if (filters?.month) {
        where.month = filters.month;
      }
      if (filters?.year) {
        where.year = filters.year;
      }
      if (filters?.yearRange) {
        where.year = {
          gte: filters.yearRange.start,
          lte: filters.yearRange.end,
        };
      }

      return await prisma.agentMetric.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError('findMany', error);
      throw error;
    }
  }

  async create(data: AgentMetricCreateInput): Promise<AgentMetric> {
    try {
      return await prisma.agentMetric.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  async update(id: string, data: AgentMetricUpdateInput): Promise<AgentMetric> {
    try {
      return await prisma.agentMetric.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  async upsert(
    agentId: string,
    month: number,
    year: number,
    data: AgentMetricCreateInput
  ): Promise<AgentMetric> {
    try {
      return await prisma.agentMetric.upsert({
        where: {
          agentId_month_year: {
            agentId,
            month,
            year,
          },
        },
        update: {
          ...data,
          updatedAt: new Date(),
        },
        create: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError('upsert', error);
      throw error;
    }
  }

  async delete(id: string): Promise<AgentMetric> {
    try {
      return await prisma.agentMetric.delete({
        where: { id },
      });
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    }
  }

  async count(filters?: AgentMetricFilters): Promise<number> {
    try {
      const where: Record<string, unknown> = {};

      if (filters?.agentId) {
        where.agentId = filters.agentId;
      }
      if (filters?.month) {
        where.month = filters.month;
      }
      if (filters?.year) {
        where.year = filters.year;
      }
      if (filters?.yearRange) {
        where.year = {
          gte: filters.yearRange.start,
          lte: filters.yearRange.end,
        };
      }

      return await prisma.agentMetric.count({ where });
    } catch (error) {
      this.handleError('count', error);
      throw error;
    }
  }

  async getLatestMetrics(agentId: string, limit = 12): Promise<AgentMetric[]> {
    try {
      return await prisma.agentMetric.findMany({
        where: { agentId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: limit,
      });
    } catch (error) {
      this.handleError('getLatestMetrics', error);
      throw error;
    }
  }

  async getAverageScores(
    agentId: string,
    yearRange?: { start: number; end: number }
  ): Promise<{
    avgScheduleAdherence: number;
    avgAttendanceRate: number;
    avgPunctualityScore: number;
    avgBreakCompliance: number;
    avgTaskCompletionRate: number;
    avgProductivityIndex: number;
    avgQualityScore: number;
    avgEfficiencyRate: number;
  } | null> {
    try {
      const where: Record<string, unknown> = { agentId };

      if (yearRange) {
        where.year = {
          gte: yearRange.start,
          lte: yearRange.end,
        };
      }

      const result = await prisma.agentMetric.aggregate({
        where,
        _avg: {
          scheduleAdherence: true,
          attendanceRate: true,
          punctualityScore: true,
          breakCompliance: true,
          taskCompletionRate: true,
          productivityIndex: true,
          qualityScore: true,
          efficiencyRate: true,
        },
      });

      if (!result._avg) {
        return null;
      }

      return {
        avgScheduleAdherence: result._avg.scheduleAdherence || 0,
        avgAttendanceRate: result._avg.attendanceRate || 0,
        avgPunctualityScore: result._avg.punctualityScore || 0,
        avgBreakCompliance: result._avg.breakCompliance || 0,
        avgTaskCompletionRate: result._avg.taskCompletionRate || 0,
        avgProductivityIndex: result._avg.productivityIndex || 0,
        avgQualityScore: result._avg.qualityScore || 0,
        avgEfficiencyRate: result._avg.efficiencyRate || 0,
      };
    } catch (error) {
      this.handleError('getAverageScores', error);
      throw error;
    }
  }
}

// Export singleton instance
export const agentMetricRepository = new AgentMetricRepository();
