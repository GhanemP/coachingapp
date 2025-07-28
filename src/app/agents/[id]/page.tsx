"use client";
import { format } from "date-fns";
import {
  User, Calendar, TrendingUp, Award, Clock,
  ChevronLeft, ChevronRight, BarChart3, FileBarChart
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { ActionItemsList } from "@/components/action-items/action-items-list";
import { ExcelImportExport } from "@/components/excel-import-export";
import { QuickNotesList } from "@/components/quick-notes/quick-notes-list";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { UserRole, SessionStatus } from "@/lib/constants";
import { METRIC_LABELS, METRIC_DESCRIPTIONS } from "@/lib/metrics";

interface AgentDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  agentProfile: {
    id: string;
    employeeId: string;
    department: string;
    hireDate: string;
  };
  teamLeader?: {
    id: string;
    name: string;
    email: string;
  };
  coachingSessions: Array<{
    id: string;
    scheduledDate: string;
    sessionDate: string;
    status: SessionStatus;
    currentScore?: number;
    teamLeader: {
      id: string;
      name: string;
    };
    sessionMetrics: Array<{
      metricName: string;
      score: number;
    }>;
  }>;
}

interface PerformanceData {
  currentMetrics: Record<string, number>;
  overallScore: number;
  historicalScores: Array<{
    date: string;
    score: number;
  }>;
  sessionCount: number;
  averageScore: number;
  improvement: number;
}

export default function AgentProfilePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        // Fetch agent details
        const agentResponse = await fetch(`/api/agents/${agentId}`);
        if (!agentResponse.ok) {
          throw new Error("Failed to fetch agent details");
        }
        const agentData = await agentResponse.json();
        setAgent(agentData);

        // Fetch performance metrics
        const metricsResponse = await fetch(`/api/agents/${agentId}/metrics`);
        if (!metricsResponse.ok) {
          throw new Error("Failed to fetch performance metrics");
        }
        const metricsData = await metricsResponse.json();
        setPerformance(metricsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (authStatus === "authenticated" && agentId) {
      fetchAgentData();
    }
  }, [authStatus, agentId]);

  const canScheduleSession = session?.user?.role === UserRole.TEAM_LEADER || 
                            session?.user?.role === UserRole.MANAGER || 
                            session?.user?.role === UserRole.ADMIN;

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent profile...</p>
        </div>
      </div>
    );
  }

  if (error || !agent || !performance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error || "Agent not found"}</p>
          <Button onClick={() => router.push("/agents")} className="mt-4">
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  const completedSessions = (
    agent?.coachingSessions // Use optional chaining
      ? agent.coachingSessions
      : []
  ).filter(s => s.status === SessionStatus.COMPLETED);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/agents")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-gray-600 mt-1">Agent Performance Profile</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <ExcelImportExport type="metrics" agentIds={[agentId]} />
          <Button
            variant="outline"
            onClick={() => router.push(`/agents/${agentId}/scorecard`)}
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            View Scorecard
          </Button>
          {canScheduleSession && (
            <Button
              onClick={() => router.push(`/sessions/schedule?agentId=${agentId}`)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
          )}
        </div>
      </div>

      {/* Agent Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Agent Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Employee ID</p>
                <p className="font-medium">{agent.agentProfile.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{agent.agentProfile.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{agent.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hire Date</p>
                <p className="font-medium">
                  {format(new Date(agent.agentProfile.hireDate), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Team Leader</p>
                <p className="font-medium">{agent.teamLeader?.name || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="font-medium">
                  {format(new Date(agent.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Overall Performance
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{performance.overallScore}</span>
              <span className="text-lg opacity-80">/ 100</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">Sessions Completed</span>
                <span className="font-medium">{performance.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Average Score</span>
                <span className="font-medium">{performance.averageScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Improvement</span>
                <span className="font-medium flex items-center gap-1">
                  {performance.improvement > 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      +{performance.improvement}%
                    </>
                  ) : (
                    `${performance.improvement}%`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Performance Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Current Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performance.currentMetrics && Object.keys(performance.currentMetrics).length > 0 ? (
            Object.entries(performance.currentMetrics).map(([metricId, score]) => {
              const metricLabel = METRIC_LABELS[metricId as keyof typeof METRIC_LABELS];
              const metricDescription = METRIC_DESCRIPTIONS[metricId as keyof typeof METRIC_DESCRIPTIONS];
              if (!metricLabel) {return null;}
              
              return (
                <MetricCard
                  key={metricId}
                  title={metricLabel}
                  value={score}
                  unit="%"
                  target={70}
                  description={metricDescription}
                />
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>No performance metrics available yet</p>
              <p className="text-sm mt-2">Complete coaching sessions to see metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Session History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Session History
        </h2>
        
        {(completedSessions && completedSessions.length > 0) ? (
          <div className="space-y-4">
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/sessions/${session.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        Session with {session.teamLeader.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(session.sessionDate), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(session.sessionDate), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {session.currentScore && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">{session.currentScore}%</p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No completed sessions yet</p>
            {canScheduleSession && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push(`/sessions/schedule?agentId=${agentId}`)}
              >
                Schedule First Session
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Performance Trend */}
      {performance.historicalScores.length > 1 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Trend</h2>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Performance chart visualization would go here</p>
            <p className="text-sm mt-2">
              Showing trend over {performance.historicalScores.length} sessions
            </p>
          </div>
        </div>
      )}

      {/* Quick Notes Section */}
      {(session?.user?.role === UserRole.TEAM_LEADER ||
        session?.user?.role === UserRole.MANAGER ||
        session?.user?.role === UserRole.ADMIN) && (
        <div className="mt-8">
          <QuickNotesList agentId={agentId} />
        </div>
      )}

      {/* Action Items Section */}
      {(session?.user?.role === UserRole.TEAM_LEADER ||
        session?.user?.role === UserRole.MANAGER ||
        session?.user?.role === UserRole.ADMIN) && (
        <div className="mt-8">
          <ActionItemsList agentId={agentId} showCreateButton={true} />
        </div>
      )}
    </div>
  );
}
