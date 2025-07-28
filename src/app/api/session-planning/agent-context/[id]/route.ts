import { subMonths } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { cached } from '@/lib/cache';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

interface AgentSessionContext {
  agent: {
    id: string;
    name: string;
    email: string;
    employeeId: string;
    department: string;
    hireDate: string;
    teamLeader?: {
      id: string;
      name: string;
    };
  };
  performance: {
    currentScore: number;
    trend: 'improving' | 'declining' | 'stable';
    riskLevel: 'low' | 'medium' | 'high';
    currentMetrics: Record<string, number>;
    trends: Record<string, number>;
    riskAreas: string[];
    strengths: string[];
    lastUpdated: string;
  };
  history: {
    quickNotes: Array<{
      id: string;
      content: string;
      category: string;
      createdAt: string;
      author: {
        name: string | null;
        role: string;
      };
    }>;
    actionItems: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: string;
      isOverdue: boolean;
    }>;
    recentSessions: Array<{
      id: string;
      sessionDate: string;
      status: string;
      currentScore?: number;
      focusAreas?: string[];
    }>;
    lastSessionDate?: string;
  };
  suggestions: {
    focusAreas: Array<{
      area: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
      supportingData: string;
    }>;
    actionItemTemplates: Array<{
      title: string;
      description: string;
      basedOn: 'performance_gap' | 'recurring_issue' | 'best_practice';
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    sessionTitle: string;
    optimalDuration: number;
  };
  indicators: {
    needsAttention: boolean;
    outstandingActionItems: number;
    recentNoteCount: number;
    daysSinceLastSession: number;
    performanceDirection: 'up' | 'down' | 'stable';
  };
}

// Helper function to calculate performance trend
function calculateTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
  const threshold = 5; // 5% threshold for trend detection
  const change = ((current - previous) / previous) * 100;
  
  if (change > threshold) {return 'improving';}
  if (change < -threshold) {return 'declining';}
  return 'stable';
}

// Helper function to determine risk level
function calculateRiskLevel(score: number, trend: string, overdueTasks: number): 'low' | 'medium' | 'high' {
  if (score < 60 || trend === 'declining' || overdueTasks > 3) {return 'high';}
  if (score < 75 || overdueTasks > 1) {return 'medium';}
  return 'low';
}

// Helper function to identify risk areas and strengths
function analyzePerformanceAreas(metrics: Record<string, number>) {
  const riskAreas: string[] = [];
  const strengths: string[] = [];
  
  Object.entries(metrics).forEach(([key, value]) => {
    if (value < 60) {
      riskAreas.push(key);
    } else if (value > 85) {
      strengths.push(key);
    }
  });
  
  return { riskAreas, strengths };
}

// Helper function to generate session title based on performance
function generateSessionTitle(
  riskLevel: 'low' | 'medium' | 'high',
  trend: 'improving' | 'declining' | 'stable',
  agentName: string
): string {
  if (riskLevel === 'high') {
    return `Performance Improvement Session - ${agentName}`;
  }
  if (trend === 'improving') {
    return `Progress Review & Goal Setting - ${agentName}`;
  }
  return `Monthly Coaching Session - ${agentName}`;
}

// Helper function to determine performance direction
function getPerformanceDirection(trend: 'improving' | 'declining' | 'stable'): 'up' | 'down' | 'stable' {
  if (trend === 'improving') {
    return 'up';
  }
  if (trend === 'declining') {
    return 'down';
  }
  return 'stable';
}

// Helper function to generate smart suggestions
function generateSuggestions(
  performance: {
    currentMetrics: Record<string, number>;
    riskLevel: 'low' | 'medium' | 'high';
    trend: 'improving' | 'declining' | 'stable';
  },
  recentNotes: Array<{ content: string; category: string }>,
  actionItems: Array<{ title: string; status: string; priority: string }>,
  agentName: string
): AgentSessionContext['suggestions'] {
  const focusAreas: AgentSessionContext['suggestions']['focusAreas'] = [];
  const actionItemTemplates: AgentSessionContext['suggestions']['actionItemTemplates'] = [];
  
  // Analyze performance gaps
  Object.entries(performance.currentMetrics).forEach(([metric, score]) => {
    const numericScore = Number(score);
    if (numericScore < 70) {
      focusAreas.push({
        area: metric.replace(/([A-Z])/g, ' $1').toLowerCase(),
        reason: `Current score of ${numericScore}% is below target`,
        priority: numericScore < 60 ? 'high' : 'medium',
        supportingData: `Performance gap of ${Math.max(0, 70 - numericScore)}% from target`
      });
      
      actionItemTemplates.push({
        title: `Improve ${metric.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        description: `Develop action plan to address ${metric} performance gap`,
        basedOn: 'performance_gap',
        priority: numericScore < 60 ? 'HIGH' : 'MEDIUM'
      });
    }
  });
  
  // Analyze recurring issues from notes
  const issueKeywords = ['issue', 'problem', 'concern', 'difficulty'];
  const recentIssues = recentNotes.filter(note => 
    issueKeywords.some(keyword => note.content.toLowerCase().includes(keyword))
  );
  
  if (recentIssues.length > 1) {
    actionItemTemplates.push({
      title: 'Address recurring performance concerns',
      description: 'Follow up on issues identified in recent observations',
      basedOn: 'recurring_issue',
      priority: 'HIGH'
    });
  }
  
  // Generate session title
  const sessionTitle = generateSessionTitle(performance.riskLevel, performance.trend, agentName);
  
  // Determine optimal duration
  const optimalDuration = performance.riskLevel === 'high' ? 90 : 60;
  
  return {
    focusAreas,
    actionItemTemplates,
    sessionTitle,
    optimalDuration
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For team leaders, verify they can access this specific agent
    if (session.user.role === UserRole.TEAM_LEADER) {
      const teamLeader = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { agents: { select: { id: true } } }
      });
      
      const agentIds = teamLeader?.agents.map(a => a.id) || [];
      
      if (!agentIds.includes(id)) {
        return NextResponse.json({
          error: 'Forbidden - Agent not assigned to this team leader'
        }, { status: 403 });
      }
    }

    // Use cached data if available (5 minute cache)
    const contextData = await cached(
      `session-context:${id}`,
      async (): Promise<AgentSessionContext> => {
        // Get agent details
        const agent = await prisma.user.findUnique({
          where: { id, role: 'AGENT' },
          include: {
            agentProfile: true,
            teamLeader: {
              select: { id: true, name: true }
            }
          }
        });

        if (!agent || !agent.agentProfile) {
          throw new Error('Agent not found');
        }

        // Get current and previous month metrics
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const previousDate = subMonths(currentDate, 1);
        const previousMonth = previousDate.getMonth() + 1;
        const previousYear = previousDate.getFullYear();

        const [currentMetric, previousMetric] = await Promise.all([
          prisma.agentMetric.findUnique({
            where: {
              agentId_month_year: {
                agentId: id,
                month: currentMonth,
                year: currentYear
              }
            }
          }),
          prisma.agentMetric.findUnique({
            where: {
              agentId_month_year: {
                agentId: id,
                month: previousMonth,
                year: previousYear
              }
            }
          })
        ]);

        // Calculate performance metrics
        const currentScore = currentMetric?.percentage || 0;
        const previousScore = previousMetric?.percentage || currentScore;
        const trend = calculateTrend(currentScore, previousScore);

        const currentMetrics = {
          scheduleAdherence: currentMetric?.scheduleAdherence || 0,
          attendanceRate: currentMetric?.attendanceRate || 0,
          punctualityScore: currentMetric?.punctualityScore || 0,
          breakCompliance: currentMetric?.breakCompliance || 0,
          taskCompletionRate: currentMetric?.taskCompletionRate || 0,
          productivityIndex: currentMetric?.productivityIndex || 0,
          qualityScore: currentMetric?.qualityScore || 0,
          efficiencyRate: currentMetric?.efficiencyRate || 0
        };

        const trends = {
          scheduleAdherence: (currentMetric?.scheduleAdherence || 0) - (previousMetric?.scheduleAdherence || 0),
          attendanceRate: (currentMetric?.attendanceRate || 0) - (previousMetric?.attendanceRate || 0),
          punctualityScore: (currentMetric?.punctualityScore || 0) - (previousMetric?.punctualityScore || 0),
          breakCompliance: (currentMetric?.breakCompliance || 0) - (previousMetric?.breakCompliance || 0),
          taskCompletionRate: (currentMetric?.taskCompletionRate || 0) - (previousMetric?.taskCompletionRate || 0),
          productivityIndex: (currentMetric?.productivityIndex || 0) - (previousMetric?.productivityIndex || 0),
          qualityScore: (currentMetric?.qualityScore || 0) - (previousMetric?.qualityScore || 0),
          efficiencyRate: (currentMetric?.efficiencyRate || 0) - (previousMetric?.efficiencyRate || 0)
        };

        // Get recent quick notes (last 5)
        const quickNotes = await prisma.quickNote.findMany({
          where: { agentId: id },
          include: {
            author: {
              select: { name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        });

        // Get outstanding action items
        const actionItems = await prisma.actionItem.findMany({
          where: {
            agentId: id,
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          orderBy: { dueDate: 'asc' },
          take: 10
        });

        // Get recent sessions (last 3)
        const recentSessions = await prisma.coachingSession.findMany({
          where: { agentId: id },
          orderBy: { sessionDate: 'desc' },
          take: 3
        });

        // Calculate indicators
        const overdueTasks = actionItems.filter(item => 
          new Date(item.dueDate) < new Date()
        ).length;

        const riskLevel = calculateRiskLevel(currentScore, trend, overdueTasks);
        const { riskAreas, strengths } = analyzePerformanceAreas(currentMetrics);

        const lastSession = recentSessions[0];
        const daysSinceLastSession = lastSession 
          ? Math.floor((Date.now() - new Date(lastSession.sessionDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Generate suggestions
        const suggestions = generateSuggestions(
          { currentMetrics, riskLevel, trend },
          quickNotes,
          actionItems,
          agent.name || 'Agent'
        );

        return {
          agent: {
            id: agent.id,
            name: agent.name || '',
            email: agent.email,
            employeeId: agent.agentProfile.employeeId,
            department: agent.agentProfile.department || '',
            hireDate: agent.agentProfile.hireDate?.toISOString() || new Date().toISOString(),
            teamLeader: agent.teamLeader ? {
              id: agent.teamLeader.id,
              name: agent.teamLeader.name || ''
            } : undefined
          },
          performance: {
            currentScore,
            trend,
            riskLevel,
            currentMetrics,
            trends,
            riskAreas,
            strengths,
            lastUpdated: currentMetric?.updatedAt.toISOString() || new Date().toISOString()
          },
          history: {
            quickNotes: quickNotes.map(note => ({
              id: note.id,
              content: note.content,
              category: note.category,
              createdAt: note.createdAt.toISOString(),
              author: note.author
            })),
            actionItems: actionItems.map(item => ({
              id: item.id,
              title: item.title,
              status: item.status,
              priority: item.priority,
              dueDate: item.dueDate.toISOString(),
              isOverdue: new Date(item.dueDate) < new Date()
            })),
            recentSessions: recentSessions.map(session => ({
              id: session.id,
              sessionDate: session.sessionDate.toISOString(),
              status: session.status,
              currentScore: session.currentScore ?? undefined,
              focusAreas: session.preparationNotes ? 
                (() => {
                  try {
                    const parsed = JSON.parse(session.preparationNotes);
                    return parsed.focusAreas || [];
                  } catch {
                    return [];
                  }
                })() : []
            })),
            lastSessionDate: lastSession?.sessionDate.toISOString()
          },
          suggestions,
          indicators: {
            needsAttention: riskLevel === 'high' || daysSinceLastSession > 30 || overdueTasks > 2,
            outstandingActionItems: actionItems.length,
            recentNoteCount: quickNotes.length,
            daysSinceLastSession,
            performanceDirection: getPerformanceDirection(trend)
          }
        };
      },
      5 * 60 * 1000 // 5 minute cache
    );

    return NextResponse.json(contextData);
  } catch (error) {
    logger.error('Error fetching agent session context:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch agent context' },
      { status: 500 }
    );
  }
}