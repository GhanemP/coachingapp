'use client';

import { format } from 'date-fns';
import {
  User,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logger from '@/lib/logger-client';

interface AgentPreview {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  currentScore: number;
  trend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  needsAttention: boolean;
  outstandingActionItems: number;
  daysSinceLastSession: number;
  performanceDirection: 'up' | 'down' | 'stable';
  recentNoteCount: number;
  lastSessionDate?: string;
}

interface EnhancedAgentSelectionProps {
  selectedAgentId: string;
  onAgentSelect: (agentId: string) => void;
  errors: Record<string, string>;
}

type SortOption = 'needsAttention' | 'performance' | 'lastSession' | 'name' | 'department';
type FilterOption =
  | 'all'
  | 'needsAttention'
  | 'highPerformers'
  | 'recentSessions'
  | 'overdueFollowups';

export function EnhancedAgentSelection({
  selectedAgentId,
  onAgentSelect,
  errors,
}: EnhancedAgentSelectionProps) {
  const [agents, setAgents] = useState<AgentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('needsAttention');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentPreview | null>(null);

  // Fetch agents with preview data
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/agents?supervised=true');
        if (!response.ok) {
          throw new Error('Failed to fetch agents');
        }

        const agentsData = await response.json();

        // Fetch preview data for each agent (in parallel for better performance)
        const agentPreviews = await Promise.all(
          agentsData.map(
            async (agent: {
              id: string;
              name: string;
              employeeId?: string;
              department?: string;
              agentProfile?: { employeeId: string; department: string };
            }) => {
              try {
                const contextResponse = await fetch(
                  `/api/session-planning/agent-context/${agent.id}`
                );
                if (contextResponse.ok) {
                  const context = await contextResponse.json();
                  return {
                    id: agent.id,
                    name: agent.name,
                    employeeId: agent.employeeId || agent.agentProfile?.employeeId || '',
                    department: agent.department || agent.agentProfile?.department || '',
                    currentScore: context.performance.currentScore,
                    trend: context.performance.trend,
                    riskLevel: context.performance.riskLevel,
                    needsAttention: context.indicators.needsAttention,
                    outstandingActionItems: context.indicators.outstandingActionItems,
                    daysSinceLastSession: context.indicators.daysSinceLastSession,
                    performanceDirection: context.indicators.performanceDirection,
                    recentNoteCount: context.indicators.recentNoteCount,
                    lastSessionDate: context.history.lastSessionDate,
                  };
                } else {
                  // Fallback for agents without context data
                  return {
                    id: agent.id,
                    name: agent.name,
                    employeeId: agent.employeeId || agent.agentProfile?.employeeId || '',
                    department: agent.department || agent.agentProfile?.department || '',
                    currentScore: 0,
                    trend: 'stable' as const,
                    riskLevel: 'low' as const,
                    needsAttention: false,
                    outstandingActionItems: 0,
                    daysSinceLastSession: 999,
                    performanceDirection: 'stable' as const,
                    recentNoteCount: 0,
                  };
                }
              } catch (error) {
                logger.error(`Error fetching context for agent ${agent.id}:`, error as Error);
                return null;
              }
            }
          )
        );

        const validPreviews = agentPreviews.filter(Boolean) as AgentPreview[];
        setAgents(validPreviews);
      } catch (error) {
        logger.error('Error fetching agents:', error as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Update selected agent when selectedAgentId changes
  useEffect(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId);
      setSelectedAgent(agent || null);
    } else {
      setSelectedAgent(null);
    }
  }, [selectedAgentId, agents]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agents;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        agent =>
          agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'needsAttention':
        filtered = filtered.filter(agent => agent.needsAttention);
        break;
      case 'highPerformers':
        filtered = filtered.filter(agent => agent.currentScore >= 85);
        break;
      case 'recentSessions':
        filtered = filtered.filter(agent => agent.daysSinceLastSession <= 7);
        break;
      case 'overdueFollowups':
        filtered = filtered.filter(agent => agent.daysSinceLastSession > 30);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'needsAttention':
          if (a.needsAttention !== b.needsAttention) {
            return a.needsAttention ? -1 : 1;
          }
          return b.currentScore - a.currentScore;
        case 'performance':
          return b.currentScore - a.currentScore;
        case 'lastSession':
          return a.daysSinceLastSession - b.daysSinceLastSession;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'department':
          return a.department.localeCompare(b.department);
        default:
          return 0;
      }
    });

    return filtered;
  }, [agents, searchTerm, filterBy, sortBy]);

  const handleAgentSelect = (agent: AgentPreview) => {
    setSelectedAgent(agent);
    onAgentSelect(agent.id);
  };

  const getTrendIcon = (trend: string, direction: string) => {
    if (direction === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    }
    if (direction === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            High Risk
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            Medium Risk
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-xs">
            Low Risk
          </Badge>
        );
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) {
      return 'text-green-600';
    }
    if (score >= 70) {
      return 'text-blue-600';
    }
    if (score >= 60) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Select Agent for Coaching Session
        </h2>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, employee ID, or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterBy} onValueChange={value => setFilterBy(value as FilterOption)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="needsAttention">Needs Attention</SelectItem>
                <SelectItem value="highPerformers">High Performers</SelectItem>
                <SelectItem value="recentSessions">Recent Sessions</SelectItem>
                <SelectItem value="overdueFollowups">Overdue Follow-ups</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needsAttention">Needs Attention</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="lastSession">Last Session</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedAgents.length} of {agents.length} agents
            {filterBy !== 'all' &&
              ` (filtered by ${filterBy.replace(/([A-Z])/g, ' $1').toLowerCase()})`}
          </div>
        </div>

        {errors.agent && <p className="text-sm text-red-600 mt-2">{errors.agent}</p>}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedAgents.map(agent => (
          <Card
            key={agent.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedAgent?.id === agent.id
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleAgentSelect(agent)}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-600">{agent.employeeId}</p>
                  <p className="text-xs text-gray-500">{agent.department}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {agent.needsAttention && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {getRiskBadge(agent.riskLevel)}
                </div>
              </div>

              {/* Performance Score */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(agent.currentScore)}`}>
                    {agent.currentScore}%
                  </span>
                  {getTrendIcon(agent.trend, agent.performanceDirection)}
                </div>
              </div>

              {/* Key Indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Outstanding Tasks</span>
                  <span
                    className={
                      agent.outstandingActionItems > 3
                        ? 'text-red-600 font-medium'
                        : 'text-gray-900'
                    }
                  >
                    {agent.outstandingActionItems}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Session</span>
                  <span
                    className={
                      agent.daysSinceLastSession > 30 ? 'text-red-600 font-medium' : 'text-gray-900'
                    }
                  >
                    {agent.daysSinceLastSession === 999
                      ? 'Never'
                      : `${agent.daysSinceLastSession}d ago`}
                  </span>
                </div>
                {agent.recentNoteCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Recent Notes</span>
                    <span className="text-blue-600">{agent.recentNoteCount}</span>
                  </div>
                )}
              </div>

              {/* Last Session Date */}
              {agent.lastSessionDate && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    Last session: {format(new Date(agent.lastSessionDate), 'MMM d, yyyy')}
                  </div>
                </div>
              )}

              {/* Selection Indicator */}
              {selectedAgent?.id === agent.id && (
                <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  Selected for session planning
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredAndSortedAgents.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-500">
            {searchTerm || filterBy !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'No agents are available for session planning'}
          </p>
          {(searchTerm || filterBy !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilterBy('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
