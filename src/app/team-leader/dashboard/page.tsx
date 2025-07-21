"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Clock, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface TeamLeaderDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  teamStats: {
    totalAgents: number;
    scheduledSessions: number;
    completedSessions: number;
    averageScore: number;
  };
  agents: Array<{
    id: string;
    name: string;
    email: string;
    employeeId: string;
    overallScore: number;
    metrics: Record<string, number>;
  }>;
  upcomingSessions: Array<{
    id: string;
    scheduledDate: string;
    agent: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function TeamLeaderDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<TeamLeaderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.TEAM_LEADER) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && session?.user?.role === UserRole.TEAM_LEADER) {
      fetchDashboardData();
    }
  }, [status, session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Leader Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {dashboardData.user.name}
        </p>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Agents"
          value={dashboardData.teamStats.totalAgents}
          unit="number"
          description="Agents under supervision"
        />
        <MetricCard
          title="Scheduled Sessions"
          value={dashboardData.teamStats.scheduledSessions}
          unit="number"
          description="Upcoming coaching sessions"
        />
        <MetricCard
          title="Completed Sessions"
          value={dashboardData.teamStats.completedSessions}
          unit="number"
          description="Sessions this month"
        />
        <MetricCard
          title="Team Average Score"
          value={dashboardData.teamStats.averageScore}
          unit="percentage"
          target={85}
          description="Overall team performance"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => router.push("/sessions/schedule")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Coaching Session
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push("/agents")}
              >
                <Users className="w-4 h-4 mr-2" />
                View Agent Performance
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push("/sessions/templates")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Create Session Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upcoming Sessions</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/sessions")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {dashboardData.upcomingSessions.length > 0 ? (
                dashboardData.upcomingSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/sessions/${session.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{session.agent.name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.scheduledDate), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.scheduledDate), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No upcoming sessions scheduled</p>
                  <Button onClick={() => router.push("/sessions/schedule")}>
                    Schedule First Session
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Agent Performance</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/agents")}>
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Agent</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Employee ID</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Overall Score</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Communication</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Problem Resolution</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Customer Service</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.agents.map((agent) => (
                <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-gray-500">{agent.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{agent.employeeId}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      agent.overallScore >= 85 ? 'bg-green-100 text-green-800' :
                      agent.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {agent.overallScore}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {agent.metrics.communication_skills || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {agent.metrics.problem_resolution || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {agent.metrics.customer_service || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/agents/${agent.id}`)}
                    >
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dashboardData.agents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No agents assigned to your team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}