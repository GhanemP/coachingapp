"use client";

import { useState, useEffect } from "react";
import { User, TrendingUp, TrendingDown, Calendar, FileText, Target, AlertCircle, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { HelpTooltip } from "@/components/ui/tooltip";

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department?: string;
}

interface AgentMetrics {
  service: number;
  productivity: number;
  quality: number;
  assiduity: number;
  performance: number;
  adherence: number;
  lateness: number;
  breakExceeds: number;
  totalScore?: number;
  percentage?: number;
}

interface QuickNote {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  author: {
    name: string | null;
    role: string;
  };
}

interface ActionItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
}

interface StepAgentReviewProps {
  selectedAgentId: string;
  onAgentSelect: (agentId: string) => void;
  errors: Record<string, string>;
}

export function StepAgentReview({ selectedAgentId, onAgentSelect, errors }: StepAgentReviewProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [trends, setTrends] = useState<Record<string, number>>({});
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Fetch agent data when selection changes
  useEffect(() => {
    if (!selectedAgentId) return;

    const fetchAgentData = async () => {
      setDataLoading(true);
      try {
        // Find selected agent
        const agent = agents.find(a => a.id === selectedAgentId);
        if (agent) {
          setSelectedAgent(agent);
        }

        // Fetch scorecard
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const scorecardResponse = await fetch(
          `/api/agents/${selectedAgentId}/scorecard?month=${currentMonth}&year=${currentYear}`
        );
        if (scorecardResponse.ok) {
          const scorecardData = await scorecardResponse.json();
          if (scorecardData.metrics && scorecardData.metrics.length > 0) {
            setMetrics(scorecardData.metrics[0]);
            setTrends(scorecardData.trends || {});
          }
        }

        // Fetch recent quick notes
        const notesResponse = await fetch(
          `/api/quick-notes?agentId=${selectedAgentId}&limit=5`
        );
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setQuickNotes(notesData.quickNotes || []);
        }

        // Fetch outstanding action items
        const actionItemsResponse = await fetch(
          `/api/action-items?agentId=${selectedAgentId}&status=PENDING&limit=5`
        );
        if (actionItemsResponse.ok) {
          const actionItemsData = await actionItemsResponse.json();
          setActionItems(actionItemsData.actionItems || []);
        }
      } catch (error) {
        console.error("Failed to fetch agent data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAgentData();
  }, [selectedAgentId, agents]);

  const getMetricTrend = (metric: string, value: number) => {
    const trend = trends[metric] || 0;
    if (trend > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trend < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const getMetricColor = (value: number) => {
    if (value >= 4.5) return "text-green-600";
    if (value >= 3.5) return "text-blue-600";
    if (value >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "LOW": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "PERFORMANCE": return <Target className="w-4 h-4" />;
      case "BEHAVIOR": return <User className="w-4 h-4" />;
      case "TRAINING": return <FileText className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Select Agent
          <HelpTooltip content="Choose the agent you'll be coaching. Their performance data will load automatically." />
        </h2>
        <div className="space-y-2">
          <label htmlFor="agent" className="block text-sm font-medium text-gray-700">
            Agent <span className="text-red-500">*</span>
          </label>
          <select
            id="agent"
            value={selectedAgentId}
            onChange={(e) => onAgentSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select an agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} - {agent.employeeId}
                {agent.department && ` (${agent.department})`}
              </option>
            ))}
          </select>
          {errors.agent && (
            <p className="text-sm text-red-600 mt-1">{errors.agent}</p>
          )}
        </div>
      </div>

      {/* Agent Performance Data */}
      {selectedAgent && !dataLoading && (
        <>
          {/* Performance Scorecard */}
          {metrics && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Performance Scorecard
                <HelpTooltip content="Current month's performance metrics. Green arrows indicate improvement from last month." />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries({
                  Service: metrics.service,
                  Productivity: metrics.productivity,
                  Quality: metrics.quality,
                  Assiduity: metrics.assiduity,
                  Performance: metrics.performance,
                  Adherence: metrics.adherence,
                  Lateness: metrics.lateness,
                  "Break Exceeds": metrics.breakExceeds,
                }).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-600">{key}</p>
                      {getMetricTrend(key.toLowerCase().replace(" ", ""), value)}
                    </div>
                    <p className={`text-2xl font-bold ${getMetricColor(value)}`}>
                      {value.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
              {metrics.percentage && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Overall Score</span>
                    <span className={`text-2xl font-bold ${getMetricColor(metrics.percentage / 20)}`}>
                      {metrics.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Quick Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Quick Notes
              <HelpTooltip content="Previous observations and feedback from team leaders. Use these to identify patterns and areas for discussion." />
            </h3>
            {quickNotes.length > 0 ? (
              <div className="space-y-3">
                {quickNotes.map((note) => (
                  <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getCategoryIcon(note.category)}
                          <span className="text-sm font-medium text-gray-700">{note.category}</span>
                          <span className="text-xs text-gray-500">
                            by {note.author.name} ({note.author.role})
                          </span>
                        </div>
                        <p className="text-gray-800">{note.content}</p>
                      </div>
                      <span className="text-xs text-gray-500 ml-4">
                        {format(new Date(note.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                ))}
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
            {actionItems.length > 0 ? (
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                        <span className="text-sm text-gray-600">
                          Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No outstanding action items</p>
            )}
          </div>
        </>
      )}

      {/* Loading State for Agent Data */}
      {selectedAgent && dataLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agent data...</p>
          </div>
        </div>
      )}
    </div>
  );
}