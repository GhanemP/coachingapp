import OpenAI from 'openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import redis from '@/lib/redis';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schemas for AI responses
const CoachingRecommendationSchema = z.object({
  type: z.enum(['skill_development', 'performance_improvement', 'behavioral_change']),
  priority: z.enum(['high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  actionItems: z.array(z.string()),
  expectedOutcome: z.string(),
  timeframe: z.string(),
});

const SessionInsightSchema = z.object({
  summary: z.string(),
  keyTakeaways: z.array(z.string()),
  strengthsIdentified: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  suggestedFollowUp: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
});

const ActionItemSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.string(),
  estimatedDuration: z.string(),
  relatedGoals: z.array(z.string()),
});

export class AIService {
  private static instance: AIService;
  
  private constructor() {}
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Generate coaching recommendations based on agent performance data
   */
  async generateCoachingRecommendations(agentId: string, options?: {
    includeHistorical?: boolean;
    focusArea?: string;
  }): Promise<z.infer<typeof CoachingRecommendationSchema>[]> {
    try {
      // Check cache first
      const cacheKey = `ai:recommendations:${agentId}:${JSON.stringify(options)}`;
      const cached = await redis?.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch agent data
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        include: {
          sessionsAsAgent: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              actionItemsV2: true,
            },
          },
          agentActionItems: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Prepare context for AI
      const context = {
        agentName: agent.name,
        recentSessions: agent.sessionsAsAgent.map(session => ({
          date: session.createdAt,
          duration: session.duration,
          actionItemsCount: session.actionItemsV2.length,
          status: session.status,
        })),
        recentActionItems: agent.agentActionItems.map(item => ({
          title: item.title,
          status: item.status,
          priority: item.priority,
          createdAt: item.createdAt,
          completedAt: item.completedDate,
        })),
        focusArea: options?.focusArea,
      };

      // Generate recommendations using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert coaching AI assistant. Generate personalized coaching recommendations based on the agent's performance data. Focus on actionable, specific recommendations that can improve their performance. Return a JSON array of recommendations following this structure: ${JSON.stringify(CoachingRecommendationSchema.shape)}`,
          },
          {
            role: 'user',
            content: `Generate 3-5 coaching recommendations for this agent based on their data:\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      const recommendations = z.array(CoachingRecommendationSchema).parse(response.recommendations || []);

      // Cache the results
      if (redis) {
        await redis.setex(cacheKey, 3600, JSON.stringify(recommendations)); // Cache for 1 hour
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating coaching recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate insights from a coaching session
   */
  async generateSessionInsights(sessionId: string): Promise<z.infer<typeof SessionInsightSchema>> {
    try {
      // Fetch session data
      const session = await prisma.coachingSession.findUnique({
        where: { id: sessionId },
        include: {
          actionItemsV2: true,
          agent: true,
          teamLeader: true,
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Prepare session context
      const context = {
        duration: session.duration,
        agentName: session.agent.name,
        coachName: session.teamLeader.name,
        notes: session.sessionNotes ? [session.sessionNotes] : [],
        actionItems: session.actionItemsV2.map(item => ({
          title: item.title,
          description: item.description,
          priority: item.priority,
        })),
        status: session.status,
      };

      // Generate insights using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert coaching AI assistant. Analyze the coaching session and provide comprehensive insights. Focus on identifying patterns, strengths, and areas for improvement. Return a JSON object following this structure: ${JSON.stringify(SessionInsightSchema.shape)}`,
          },
          {
            role: 'user',
            content: `Analyze this coaching session and provide insights:\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 1500,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      const insights = SessionInsightSchema.parse(response);

      // Store insights in database (we'll store in sessionNotes for now)
      await prisma.coachingSession.update({
        where: { id: sessionId },
        data: {
          sessionNotes: JSON.stringify({
            originalNotes: session.sessionNotes,
            aiInsights: insights,
          }),
        },
      });

      return insights;
    } catch (error) {
      console.error('Error generating session insights:', error);
      throw error;
    }
  }

  /**
   * Suggest action items based on session content
   */
  async suggestActionItems(sessionId: string, count: number = 5): Promise<z.infer<typeof ActionItemSuggestionSchema>[]> {
    try {
      // Fetch session data
      const session = await prisma.coachingSession.findUnique({
        where: { id: sessionId },
        include: {
          actionItemsV2: true,
          agent: {
            include: {
              agentActionItems: {
                take: 10,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Prepare context
      const context = {
        sessionNotes: session.sessionNotes ? [session.sessionNotes] : [],
        existingActionItems: session.actionItemsV2.map(item => item.title),
        historicalActionItems: session.agent.agentActionItems.map(item => ({
          title: item.title,
          status: item.status,
          completedSuccessfully: item.status === 'COMPLETED',
        })),
      };

      // Generate suggestions using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert coaching AI assistant. Suggest actionable items based on the coaching session content. Avoid duplicating existing action items. Focus on specific, measurable, and achievable tasks. Return a JSON object with an array of suggestions following this structure: ${JSON.stringify(ActionItemSuggestionSchema.shape)}`,
          },
          {
            role: 'user',
            content: `Suggest ${count} action items based on this session:\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 1500,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      const suggestions = z.array(ActionItemSuggestionSchema).parse(response.suggestions || []);

      return suggestions.slice(0, count);
    } catch (error) {
      console.error('Error suggesting action items:', error);
      throw error;
    }
  }

  /**
   * Generate a performance summary for an agent
   */
  async generatePerformanceSummary(agentId: string, timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<{
    summary: string;
    metrics: Record<string, number>;
    trends: string[];
    recommendations: string[];
  }> {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeframe) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
      }

      // Fetch performance data
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        include: {
          sessionsAsAgent: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            include: {
              actionItemsV2: true,
            },
          },
          agentActionItems: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Calculate metrics
      const metrics = {
        totalSessions: agent.sessionsAsAgent.length,
        totalActionItems: agent.agentActionItems.length,
        completedActionItems: agent.agentActionItems.filter(item => item.status === 'COMPLETED').length,
        completionRate: agent.agentActionItems.length > 0
          ? (agent.agentActionItems.filter(item => item.status === 'COMPLETED').length / agent.agentActionItems.length) * 100
          : 0,
        averageSessionDuration: agent.sessionsAsAgent.length > 0
          ? agent.sessionsAsAgent.reduce((sum, session) => sum + (session.duration || 0), 0) / agent.sessionsAsAgent.length
          : 0,
      };

      // Generate summary using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert coaching AI assistant. Generate a comprehensive performance summary that highlights achievements, identifies trends, and provides actionable recommendations.',
          },
          {
            role: 'user',
            content: `Generate a performance summary for ${agent.name} for the past ${timeframe}:\n\nMetrics: ${JSON.stringify(metrics, null, 2)}\n\nSessions: ${agent.sessionsAsAgent.length}\nAction Items: ${agent.agentActionItems.length} (${metrics.completedActionItems} completed)`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const summaryText = completion.choices[0].message.content || '';
      
      // Extract trends and recommendations (simplified for now)
      const trends = [
        metrics.completionRate > 80 ? 'High action item completion rate' : 'Action item completion needs improvement',
        metrics.totalSessions > 4 ? 'Consistent coaching engagement' : 'Coaching frequency could be increased',
        metrics.averageSessionDuration > 30 ? 'Thorough coaching sessions' : 'Consider longer coaching sessions',
      ];

      const recommendations = [
        metrics.completionRate < 70 ? 'Focus on breaking down action items into smaller, manageable tasks' : 'Maintain current action item approach',
        metrics.totalSessions < 4 ? 'Schedule regular weekly coaching sessions' : 'Continue current coaching cadence',
        'Set specific, measurable goals for the next period',
      ];

      return {
        summary: summaryText,
        metrics,
        trends,
        recommendations,
      };
    } catch (error) {
      console.error('Error generating performance summary:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment from text content
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    keywords: string[];
  }> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the provided text. Return a JSON object with sentiment (positive/neutral/negative), confidence (0-1), and key emotional keywords.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        sentiment: response.sentiment || 'neutral',
        confidence: response.confidence || 0.5,
        keywords: response.keywords || [],
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentiment: 'neutral',
        confidence: 0,
        keywords: [],
      };
    }
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();