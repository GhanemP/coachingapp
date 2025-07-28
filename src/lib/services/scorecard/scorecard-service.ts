import { Prisma } from '@prisma/client';

import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export interface ScorecardQueryParams {
  year: number;
  month?: number;
}

export interface ScorecardMetricsInput {
  month: number;
  year: number;
  rawData?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  weights?: Record<string, unknown>;
  notes?: string;
}

export interface ScorecardDeleteParams {
  month: number;
  year: number;
}

export interface AuthorizedUser {
  id: string;
  role: UserRole;
}

/**
 * Service class for handling scorecard operations
 */
export class ScorecardService {
  /**
   * Check if user has permission to view scorecards
   */
  static async checkViewPermission(userRole: UserRole): Promise<boolean> {
    try {
      // Try database-based permission check first
      const hasDbPermission = await hasPermission(userRole, 'view_scorecards');
      if (hasDbPermission) {
        return true;
      }
      
      // FALLBACK: If database permission doesn't exist, use role-based check
      // This ensures the system works even if permissions aren't properly seeded
      logger.info('Falling back to role-based permission check for view_scorecards', { userRole });
      return ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(userRole);
    } catch (error) {
      logger.error('Error checking view permission, falling back to role-based check:', error as Error);
      // Fallback to role-based permission system
      return ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(userRole);
    }
  }

  /**
   * Check if user has permission to modify scorecards
   */
  static checkModifyPermission(userRole: string): boolean {
    return ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(userRole);
  }

  /**
   * Check if user has permission to delete scorecards
   */
  static checkDeletePermission(userRole: string): boolean {
    return ['MANAGER', 'ADMIN'].includes(userRole);
  }

  /**
   * Get agent data with profile information
   */
  static async getAgentData(agentId: string) {
    const agentData = await prisma.user.findUnique({
      where: {
        id: agentId,
        role: 'AGENT'
      },
      include: {
        agentProfile: true,
      },
    });

    if (!agentData) {
      throw new Error('Agent not found');
    }

    return agentData;
  }

  /**
   * Check access permissions based on role hierarchy
   */
  static async checkAccessPermissions(
    user: AuthorizedUser,
    agentId: string
  ): Promise<boolean> {
    // Agents can only view their own data
    if (user.role === 'AGENT') {
      return agentId === user.id;
    }

    // Team leaders can view their team members' data
    if (user.role === 'TEAM_LEADER') {
      const teamLeader = await prisma.user.findUnique({
        where: { id: user.id },
        include: { agents: true }
      });

      const isTeamMember = teamLeader?.agents.some(a => a.id === agentId);
      return isTeamMember || agentId === user.id;
    }

    // Managers and admins can view all data
    return ['MANAGER', 'ADMIN'].includes(user.role);
  }

  /**
   * Build query conditions for metrics retrieval
   */
  static buildQueryConditions(
    agentId: string,
    params: ScorecardQueryParams
  ): Prisma.AgentMetricWhereInput {
    const whereConditions: Prisma.AgentMetricWhereInput = {
      agentId,
      year: params.year,
    };

    if (params.month) {
      whereConditions.month = params.month;
    }

    return whereConditions;
  }

  /**
   * Get agent metrics based on query conditions
   */
  static async getAgentMetrics(whereConditions: Prisma.AgentMetricWhereInput) {
    return await prisma.agentMetric.findMany({
      where: whereConditions,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });
  }

  /**
   * Get previous period metric for trend calculation
   */
  static async getPreviousMetric(
    agentId: string,
    year: number,
    month: number
  ) {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    
    return await prisma.agentMetric.findUnique({
      where: {
        agentId_month_year: {
          agentId,
          month: previousMonth,
          year: previousYear,
        },
      },
    });
  }

  /**
   * Create or update agent metrics
   */
  static async upsertAgentMetrics(
    agentId: string,
    input: ScorecardMetricsInput,
    dbData: Record<string, unknown>
  ) {
    return await prisma.agentMetric.upsert({
      where: {
        agentId_month_year: {
          agentId,
          month: input.month,
          year: input.year,
        },
      },
      update: {
        ...dbData,
        updatedAt: new Date(),
      },
      create: {
        agentId,
        month: input.month,
        year: input.year,
        ...dbData,
      } as unknown as Prisma.AgentMetricCreateInput, // Type assertion needed due to Prisma's complex type requirements
    });
  }

  /**
   * Delete agent metrics
   */
  static async deleteAgentMetrics(
    agentId: string,
    params: ScorecardDeleteParams
  ) {
    return await prisma.agentMetric.delete({
      where: {
        agentId_month_year: {
          agentId,
          month: params.month,
          year: params.year,
        },
      },
    });
  }

  /**
   * Log service operations
   */
  static logOperation(operation: string, agentId: string, details?: Record<string, unknown>) {
    logger.info(`Scorecard ${operation}`, {
      operation,
      agentId,
      ...details
    });
  }

  /**
   * Log service errors
   */
  static logError(operation: string, error: Error, agentId?: string) {
    logger.error(`Error in scorecard ${operation}:`, error, {
      agentId
    });
  }
}