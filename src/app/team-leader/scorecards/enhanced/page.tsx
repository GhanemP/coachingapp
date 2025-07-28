"use client";
import { format } from "date-fns";
import {
  Users,
  FileBarChart,
  TrendingUp,
  Award,
  Search,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  AlertTriangle,
  Target,
  Star,
  ArrowUpDown,
  Download,
  Eye,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import logger from '@/lib/logger-client';
import {
  getYearOptions,
  METRIC_LABELS
} from "@/lib/metrics";


interface Agent {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  createdAt: string;
  averageScore: number;
  metricsCount: number;
}

interface AgentMetrics {
  id: string;
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
  percentage: number;
  updatedAt: string;
  agent: {
    name: string;
    employeeId: string;
  };
}

interface PerformanceInsight {
  type: 'strength' | 'improvement' | 'risk';
  title: string;
  description: string;
  metric: string;
  value: number;
  agentId: string;
  agentName: string;
}

type SortField = 'name' | 'averageScore' | 'lastUpdated' | 'riskLevel';
type FilterType = 'all' | 'highPerformers' | 'needsImprovement' | 'atRisk';
type ViewMode = 'overview' | 'detailed' | 'comparison' | 'trends';

export default function EnhancedScorecardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allMetrics, setAllMetrics] = useState<AgentMetrics[]>([]);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('averageScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      if (!hasPermission("VIEW_SCORECARDS") && session?.user?.role !== "TEAM_LEADER") {
        router.push("/dashboard");
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [status, session, router, hasPermission, permissionsLoading]);

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch agents with supervised parameter for team leaders
        const agentsResponse = await fetch("/api/agents?supervised=true");
        if (!agentsResponse.ok) {throw new Error("Failed to fetch agents");}
        const agentsData = await agentsResponse.json();
        
        // Fetch metrics for all agents for the selected year
        const metricsPromises = agentsData.map((agent: Agent) =>
          fetch(`/api/agents/${agent.id}/scorecard?year=${selectedPeriod.year}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
        
        const metricsResults = await Promise.all(metricsPromises);
        const allMetricsData: AgentMetrics[] = [];
        
        metricsResults.forEach((result, index) => {
          if (result && result.metrics) {
            const agent = agentsData[index];
            result.metrics.forEach((metric: AgentMetrics) => {
              allMetricsData.push({
                ...metric,
                agent: {
                  name: agent.name,
                  employeeId: agent.employeeId
                }
              });
            });
          }
        });
        
        setAgents(agentsData);
        setAllMetrics(allMetricsData);
        
        // Generate insights
        generateInsights(agentsData, allMetricsData);
        
      } catch (error) {
        logger.error("Error fetching data:", error as Error);
        toast.error("Failed to load scorecard data");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && !permissionsLoading && 
        (hasPermission("VIEW_SCORECARDS") || session?.user?.role === "TEAM_LEADER")) {
      fetchData();
    }
  }, [status, session, selectedPeriod.year, hasPermission, permissionsLoading]);

  // Generate performance insights
  const generateInsights = (agentsData: Agent[], metricsData: AgentMetrics[]) => {
    const insights: PerformanceInsight[] = [];
    
    agentsData.forEach(agent => {
      const agentMetrics = metricsData.filter(m => m.agentId === agent.id);
      if (agentMetrics.length === 0) {return;}
      
      const latestMetric = agentMetrics.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      
      // Check for strengths (metrics > 90%)
      Object.entries(METRIC_LABELS).forEach(([key, label]) => {
        const value = latestMetric[key as keyof AgentMetrics] as number;
        if (value > 90) {
          insights.push({
            type: 'strength',
            title: `Excellent ${label}`,
            description: `${agent.name} excels in ${label.toLowerCase()} with ${value.toFixed(1)}%`,
            metric: key,
            value,
            agentId: agent.id,
            agentName: agent.name
          });
        } else if (value < 60) {
          insights.push({
            type: 'risk',
            title: `Low ${label}`,
            description: `${agent.name} needs improvement in ${label.toLowerCase()} (${value.toFixed(1)}%)`,
            metric: key,
            value,
            agentId: agent.id,
            agentName: agent.name
          });
        } else if (value < 75) {
          insights.push({
            type: 'improvement',
            title: `Moderate ${label}`,
            description: `${agent.name} has room for improvement in ${label.toLowerCase()} (${value.toFixed(1)}%)`,
            metric: key,
            value,
            agentId: agent.id,
            agentName: agent.name
          });
        }
      });
    });
    
    setInsights(insights.slice(0, 20)); // Limit to top 20 insights
  };

  // Filtered and sorted agents
  const filteredAndSortedAgents = useMemo(() => {
    const filtered = agents.filter(agent => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!agent.name.toLowerCase().includes(searchLower) &&
            !agent.employeeId.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Performance filter
      switch (filterType) {
        case 'highPerformers':
          return agent.averageScore >= 85;
        case 'needsImprovement':
          return agent.averageScore >= 60 && agent.averageScore < 85;
        case 'atRisk':
          return agent.averageScore < 60;
        default:
          return true;
      }
    });
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'averageScore':
          aValue = a.averageScore;
          bValue = b.averageScore;
          break;
        case 'lastUpdated':
          const aMetrics = allMetrics.filter(m => m.agentId === a.id);
          const bMetrics = allMetrics.filter(m => m.agentId === b.id);
          aValue = aMetrics.length > 0 ? new Date(aMetrics[0]?.updatedAt).getTime() : 0;
          bValue = bMetrics.length > 0 ? new Date(bMetrics[0]?.updatedAt).getTime() : 0;
          break;
        case 'riskLevel':
          aValue = getRiskLevel(a.averageScore);
          bValue = getRiskLevel(b.averageScore);
          break;
        default:
          aValue = a.averageScore;
          bValue = b.averageScore;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      const numA = typeof aValue === 'number' ? aValue : 0;
      const numB = typeof bValue === 'number' ? bValue : 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
    
    return filtered;
  }, [agents, allMetrics, searchTerm, filterType, sortField, sortDirection]);

  // Performance statistics
  const performanceStats = useMemo(() => {
    if (agents.length === 0) {return null;}
    
    const scores = agents.map(a => a.averageScore);
    const highPerformers = scores.filter(s => s >= 85).length;
    const needsImprovement = scores.filter(s => s >= 60 && s < 85).length;
    const atRisk = scores.filter(s => s < 60).length;
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return {
      total: agents.length,
      highPerformers,
      needsImprovement,
      atRisk,
      avgScore: Math.round(avgScore * 10) / 10
    };
  }, [agents]);

  const getRiskLevel = (score: number) => {
    if (score < 60) {return 3;}
    if (score < 75) {return 2;}
    return 1;
  };

  const getInsightBackgroundClass = (type: string) => {
    switch (type) {
      case 'strength': return 'bg-green-50 border-green-200';
      case 'improvement': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-red-50 border-red-200';
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 85) {return <Badge className="bg-green-100 text-green-800">High Performer</Badge>;}
    if (score >= 75) {return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;}
    if (score >= 60) {return <Badge className="bg-yellow-100 text-yellow-800">Needs Improvement</Badge>;}
    return <Badge className="bg-red-100 text-red-800">At Risk</Badge>;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength': return <Star className="w-4 h-4 text-green-600" />;
      case 'improvement': return <Target className="w-4 h-4 text-yellow-600" />;
      case 'risk': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Zap className="w-4 h-4 text-blue-600" />;
    }
  };

  if (status === "loading" || isCheckingAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enhanced scorecards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Agent Scorecards</h1>
            <p className="text-gray-600 mt-2">
              Advanced analytics and visualization for your team&apos;s performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Import/Export
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      {performanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Agents</p>
                  <p className="text-2xl font-bold">{performanceStats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Performers</p>
                  <p className="text-2xl font-bold text-green-600">{performanceStats.highPerformers}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Need Improvement</p>
                  <p className="text-2xl font-bold text-yellow-600">{performanceStats.needsImprovement}</p>
                </div>
                <Target className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">At Risk</p>
                  <p className="text-2xl font-bold text-red-600">{performanceStats.atRisk}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Team Average</p>
                  <p className="text-2xl font-bold">{performanceStats.avgScore}%</p>
                </div>
                <Award className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="highPerformers">High Performers (85%+)</SelectItem>
                <SelectItem value="needsImprovement">Needs Improvement (60-84%)</SelectItem>
                <SelectItem value="atRisk">At Risk (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
              <SelectTrigger className="w-48">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="averageScore">Average Score</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
                <SelectItem value="riskLevel">Risk Level</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Select 
              value={selectedPeriod.year.toString()} 
              onValueChange={(value) => setSelectedPeriod(prev => ({ ...prev, year: parseInt(value) }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getYearOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Enhanced Content with Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            Detailed View
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Comparison
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Cards */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance ({filteredAndSortedAgents.length} agents)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredAndSortedAgents.map((agent) => {
                      const agentMetrics = allMetrics.filter(m => m.agentId === agent.id);
                      const latestMetric = agentMetrics.sort((a, b) => 
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                      )[0];
                      
                      return (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/agents/${agent.id}/scorecard`)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-semibold">{agent.name}</p>
                                <p className="text-sm text-gray-500">{agent.employeeId}</p>
                              </div>
                              {getRiskBadge(agent.averageScore)}
                            </div>
                            {latestMetric && (
                              <div className="mt-2 text-xs text-gray-500">
                                Last updated: {format(new Date(latestMetric.updatedAt), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{agent.averageScore.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">{agent.metricsCount} months</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.slice(0, 10).map((insight, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getInsightBackgroundClass(insight.type)}`}
                      >
                        <div className="flex items-start gap-2">
                          {getInsightIcon(insight.type)}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{insight.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed metrics view with individual performance breakdowns coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Agent Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Side-by-side agent comparison tools coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Historical performance trend analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}