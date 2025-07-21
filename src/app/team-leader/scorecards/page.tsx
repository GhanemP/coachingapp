"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScorecardForm } from "@/components/ui/scorecard-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  getMonthOptions, 
  getYearOptions,
  formatMonth,
  getPercentageColor
} from "@/lib/metrics";
import { 
  Users, 
  FileBarChart, 
  Plus, 
  Calendar,
  TrendingUp,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  createdAt: string;
}

interface TeamLeaderData {
  agents: Agent[];
  recentMetrics: Array<{
    id: string;
    agent: {
      user: {
        name: string;
      };
    };
    month: number;
    year: number;
    totalScore: number;
    percentage: number;
    updatedAt: string;
  }>;
}

interface ExistingMetric {
  id: string;
  service: number;
  productivity: number;
  quality: number;
  assiduity: number;
  performance: number;
  adherence: number;
  lateness: number;
  breakExceeds: number;
  serviceWeight: number;
  productivityWeight: number;
  qualityWeight: number;
  assiduityWeight: number;
  performanceWeight: number;
  adherenceWeight: number;
  latenessWeight: number;
  breakExceedsWeight: number;
  notes: string | null;
}

export default function TeamLeaderScorecardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeamLeaderData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [existingMetric, setExistingMetric] = useState<ExistingMetric | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "TEAM_LEADER") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch team leader's agents
        const response = await fetch("/api/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        
        const agents = await response.json();
        
        // Fetch recent metrics for all agents
        const metricsPromises = agents.map((agent: Agent) =>
          fetch(`/api/agents/${agent.id}/scorecard?year=${selectedYear}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
        
        const metricsResults = await Promise.all(metricsPromises);
        const recentMetrics = metricsResults
          .filter(result => result && result.metrics && result.metrics.length > 0)
          .flatMap((result, index) => {
            // Add agent information to each metric
            const agent = agents[index];
            return result.metrics.map((metric: ExistingMetric & { updatedAt: string }) => ({
              ...metric,
              agent: {
                user: {
                  name: agent.name
                }
              }
            }));
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10);
        
        setData({ agents, recentMetrics });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load scorecard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && session?.user?.role === "TEAM_LEADER") {
      fetchData();
    }
  }, [status, session, selectedYear, toast]);

  const handleAgentSelect = async (agentId: string) => {
    setSelectedAgent(agentId);
    setShowForm(false);
    setExistingMetric(null);

    // Check if metric exists for selected month/year
    try {
      const response = await fetch(
        `/api/agents/${agentId}/scorecard?year=${selectedYear}&month=${selectedMonth}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.metrics && data.metrics.length > 0) {
          setExistingMetric(data.metrics[0]);
        }
      }
    } catch (error) {
      console.error("Error checking existing metric:", error);
    }
  };

  const handleSubmit = async (formData: {
    month: number;
    year: number;
    metrics: {
      service: number;
      productivity: number;
      quality: number;
      assiduity: number;
      performance: number;
      adherence: number;
      lateness: number;
      breakExceeds: number;
    };
    weights: {
      serviceWeight: number;
      productivityWeight: number;
      qualityWeight: number;
      assiduityWeight: number;
      performanceWeight: number;
      adherenceWeight: number;
      latenessWeight: number;
      breakExceedsWeight: number;
    };
    notes: string;
  }) => {
    if (!selectedAgent) return;

    try {
      const response = await fetch(`/api/agents/${selectedAgent}/scorecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save scorecard");

      toast({
        title: "Success",
        description: "Scorecard saved successfully",
      });

      setShowForm(false);
      setExistingMetric(null);
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error saving scorecard:", error);
      toast({
        title: "Error",
        description: "Failed to save scorecard",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scorecards...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedAgentData = data.agents.find(a => a.id === selectedAgent);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agent Scorecards</h1>
        <p className="text-gray-600 mt-2">
          Manage and track performance metrics for your team
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold">{data.agents.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scorecards This Month</p>
                <p className="text-2xl font-bold">
                  {data.recentMetrics.filter(m => 
                    m.month === new Date().getMonth() + 1 && 
                    m.year === new Date().getFullYear()
                  ).length}
                </p>
              </div>
              <FileBarChart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">
                  {data.recentMetrics.length > 0
                    ? Math.round(
                        data.recentMetrics.reduce((sum, m) => sum + m.percentage, 0) / 
                        data.recentMetrics.length
                      )
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  value={selectedAgent || ""}
                  onValueChange={handleAgentSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedAgent && (
                  <>
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Period</p>
                      <div className="space-y-2">
                        <Select
                          value={selectedYear.toString()}
                          onValueChange={(value) => setSelectedYear(parseInt(value))}
                        >
                          <SelectTrigger>
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

                        <Select
                          value={selectedMonth.toString()}
                          onValueChange={(value) => setSelectedMonth(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getMonthOptions().map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {existingMetric ? 'Edit' : 'Create'} Scorecard
                    </Button>

                    {selectedAgentData && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/agents/${selectedAgent}/scorecard`)}
                      >
                        <FileBarChart className="mr-2 h-4 w-4" />
                        View Full Scorecard
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scorecard Form or Recent Activity */}
        <div className="lg:col-span-2">
          {showForm && selectedAgent ? (
            <ScorecardForm
              agentId={selectedAgent}
              month={selectedMonth}
              year={selectedYear}
              initialData={existingMetric ? {
                ...existingMetric,
                notes: existingMetric.notes || undefined
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Scorecards</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentMetrics.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentMetrics.map((metric) => (
                      <div
                        key={metric.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{metric.agent.user.name}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatMonth(metric.month)} {metric.year}
                            </span>
                            <span>
                              Updated {format(new Date(metric.updatedAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold">{metric.totalScore.toFixed(1)}</p>
                            <p className="text-xs text-gray-500">Score</p>
                          </div>
                          <Badge 
                            variant={metric.percentage >= 70 ? "default" : "destructive"}
                            className={getPercentageColor(metric.percentage)}
                          >
                            {metric.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No scorecards created yet</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Select an agent and create their first scorecard
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}