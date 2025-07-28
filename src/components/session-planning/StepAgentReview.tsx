'use client';

import { format } from 'date-fns';
import {
  User,
  TrendingUp,
  TrendingDown,
  FileText,
  Target,
  AlertCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { HelpTooltip } from '@/components/ui/tooltip';
import logger from '@/lib/logger-client';

import { EnhancedAgentSelection } from './EnhancedAgentSelection';

// Unused interfaces - commented out to fix ESLint errors
// interface Agent {
//   id: string;
//   name: string;
//   email: string;
//   employeeId: string;
//   department?: string;
// }

// interface AgentMetrics {
//   service: number;
//   productivity: number;
//   quality: number;
//   assiduity: number;
//   performance: number;
//   adherence: number;
//   lateness: number;
//   breakExceeds: number;
//   totalScore?: number;
//   percentage?: number;
// }

// interface QuickNote {
//   id: string;
//   content: string;
//   category: string;
//   createdAt: string;
//   author: {
//     name: string | null;
//     role: string;
//   };
// }

// interface ActionItem {
//   id: string;
//   title: string;
//   status: string;
//   priority: string;
//   dueDate: string;
// }

interface StepAgentReviewProps {
  selectedAgentId: string;
  onAgentSelect: (agentId: string) => void;
  errors: Record<string, string>;
}

export function StepAgentReview({ selectedAgentId, onAgentSelect, errors }: StepAgentReviewProps) {
  const [agentContext, setAgentContext] = useState<{
    agent: {
      id: string;
      name: string;
      email: string;
      employeeId: string;
      department: string;
    };
    performance: {
      currentScore: number;
      trend: string;
      riskLevel: string;
      currentMetrics: Record<string, number>;
      trends: Record<string, number>;
      riskAreas: string[];
      strengths: string[];
    };
    history: {
      quickNotes: Array<{
        id: string;
        content: string;
        category: string;
        createdAt: string;
        author: { name: string; role: string };
      }>;
      actionItems: Array<{
        id: string;
        title: string;
        priority: string;
        dueDate: string;
        isOverdue: boolean;
      }>;
    };
    suggestions: {
      focusAreas: Array<{
        area: string;
        reason: string;
        supportingData: string;
        priority: string;
      }>;
    };
    indicators: {
      needsAttention: boolean;
      outstandingActionItems: number;
    };
  } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Fetch comprehensive agent context when selection changes
  useEffect(() => {
    if (!selectedAgentId) {
      setAgentContext(null);
      return;
    }

    const fetchAgentContext = async () => {
      setDataLoading(true);
      try {
        const response = await fetch(`/api/session-planning/agent-context/${selectedAgentId}`);
        if (response.ok) {
          const context = await response.json();
          setAgentContext(context);
        } else {
          logger.error('Failed to fetch agent context');
          setAgentContext(null);
        }
      } catch (error) {
        logger.error('Failed to fetch agent context:', error as Error);
        setAgentContext(null);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAgentContext();
  }, [selectedAgentId]);

  const getMetricTrend = (trendValue: number) => {
    if (trendValue > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trendValue < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const getMetricColor = (value: number) => {
    if (value >= 4.5) {
      return 'text-green-600';
    }
    if (value >= 3.5) {
      return 'text-blue-600';
    }
    if (value >= 2.5) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PERFORMANCE':
        return <Target className="w-4 h-4" />;
      case 'BEHAVIOR':
        return <User className="w-4 h-4" />;
      case 'TRAINING':
        return <FileText className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getRiskLevelBackgroundClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-50';
      case 'medium':
        return 'bg-yellow-50';
      default:
        return 'bg-green-50';
    }
  };

  const getRiskLevelTextClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-700';
      case 'medium':
        return 'text-yellow-700';
      default:
        return 'text-green-700';
    }
  };

  const getSuggestionPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Agent Selection */}
      <EnhancedAgentSelection
        selectedAgentId={selectedAgentId}
        onAgentSelect={onAgentSelect}
        errors={errors}
      />

      {/* Agent Performance Context */}
      {selectedAgentId && !dataLoading && agentContext && (
        <>
          {/* Performance Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance Overview
              <HelpTooltip content="Current performance metrics with trend indicators and risk assessment." />
            </h3>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Overall Score</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {agentContext.performance.currentScore}%
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {agentContext.performance.trend === 'improving' && (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    )}
                    {agentContext.performance.trend === 'declining' && (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-sm text-blue-700 capitalize">
                      {agentContext.performance.trend}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-lg p-4 ${getRiskLevelBackgroundClass(agentContext.performance.riskLevel)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Risk Level</p>
                    <p
                      className={`text-lg font-bold capitalize ${getRiskLevelTextClass(agentContext.performance.riskLevel)}`}
                    >
                      {agentContext.performance.riskLevel}
                    </p>
                  </div>
                  {agentContext.indicators.needsAttention && (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Outstanding Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {agentContext.indicators.outstandingActionItems}
                    </p>
                  </div>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(agentContext.performance.currentMetrics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </p>
                    {getMetricTrend(agentContext.performance.trends[key] || 0)}
                  </div>
                  <p className={`text-xl font-bold ${getMetricColor(Number(value))}`}>
                    {Number(value).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            {/* Risk Areas and Strengths */}
            {(agentContext.performance.riskAreas.length > 0 ||
              agentContext.performance.strengths.length > 0) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agentContext.performance.riskAreas.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        Areas Needing Attention
                      </h4>
                      <div className="space-y-1">
                        {agentContext.performance.riskAreas.map((area: string) => (
                          <span
                            key={area}
                            className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-2"
                          >
                            {area.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {agentContext.performance.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                      <div className="space-y-1">
                        {agentContext.performance.strengths.map((strength: string) => (
                          <span
                            key={strength}
                            className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2"
                          >
                            {strength.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recent Quick Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Quick Notes
              <HelpTooltip content="Previous observations and feedback from team leaders. Use these to identify patterns and areas for discussion." />
            </h3>
            {agentContext.history.quickNotes.length > 0 ? (
              <div className="space-y-3">
                {agentContext.history.quickNotes.map(
                  (note: {
                    id: string;
                    content: string;
                    category: string;
                    createdAt: string;
                    author: { name: string; role: string };
                  }) => (
                    <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(note.category)}
                            <span className="text-sm font-medium text-gray-700">
                              {note.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              by {note.author.name} ({note.author.role})
                            </span>
                          </div>
                          <p className="text-gray-800">{note.content}</p>
                        </div>
                        <span className="text-xs text-gray-500 ml-4">
                          {format(new Date(note.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-gray-500">No recent notes found</p>
            )}
          </div>

          {/* Outstanding Action Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Outstanding Action Items
              <HelpTooltip content="Incomplete tasks from previous sessions. Consider following up on these during your session." />
            </h3>
            {agentContext.history.actionItems.length > 0 ? (
              <div className="space-y-3">
                {agentContext.history.actionItems.map(
                  (item: {
                    id: string;
                    title: string;
                    priority: string;
                    dueDate: string;
                    isOverdue: boolean;
                  }) => (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between p-3 rounded-lg ${
                        item.isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}
                          >
                            {item.priority}
                          </span>
                          <span
                            className={`text-sm ${item.isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}
                          >
                            Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}
                            {item.isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-gray-500">No outstanding action items</p>
            )}
          </div>

          {/* Smart Suggestions */}
          {agentContext.suggestions.focusAreas.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-900">
                <Target className="w-5 h-5" />
                Suggested Focus Areas
                <HelpTooltip content="AI-generated suggestions based on performance analysis and historical patterns." />
              </h3>
              <div className="space-y-3">
                {agentContext.suggestions.focusAreas.map(
                  (
                    suggestion: {
                      area: string;
                      reason: string;
                      supportingData: string;
                      priority: string;
                    },
                    index: number
                  ) => (
                    <div key={index} className="bg-white rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {suggestion.area}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                          <p className="text-xs text-blue-600 mt-2">{suggestion.supportingData}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getSuggestionPriorityClass(suggestion.priority)}`}
                        >
                          {suggestion.priority} priority
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading State for Agent Data */}
      {selectedAgentId && dataLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agent context...</p>
          </div>
        </div>
      )}
    </div>
  );
}
