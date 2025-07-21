"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Calendar, ChevronRight, BarChart3, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface ManagerDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  overallStats: {
    totalTeamLeaders: number;
    totalAgents: number;
    overallAverageScore: number;
  };
  teamStats: Array<{
    teamLeaderId: string;
    teamLeaderName: string;
    agentCount: number;
    averageScore: number;
  }>;
  recentSessions: Array<{
    id: string;
    sessionDate: string;
    status: string;
    agent: {
      id: string;
      name: string;
    };
    teamLeader: {
      id: string;
      name: string;
    };
  }>;
}

export default function ManagerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.MANAGER) {
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

    if (status === "authenticated" && session?.user?.role === UserRole.MANAGER) {
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
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {dashboardData.user.name}
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Team Leaders"
          value={dashboardData.overallStats.totalTeamLeaders}
          unit="number"
          description="Active team leaders"
        />
        <MetricCard
          title="Total Agents"
          value={dashboardData.overallStats.totalAgents}
          unit="number"
          description="Across all teams"
        />
        <MetricCard
          title="Overall Performance"
          value={dashboardData.overallStats.overallAverageScore}
          unit="percentage"
          target={85}
          description="Average across all teams"
        />
      </div>

      {/* Team Performance Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Team Performance Overview</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
            View All Teams
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardData.teamStats.map((team) => (
            <div
              key={team.teamLeaderId}
              className="p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => router.push(`/agents?teamLeader=${team.teamLeaderId}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{team.teamLeaderName}</h3>
                  <p className="text-sm text-gray-500">{team.agentCount} agents</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-semibold">{team.averageScore}%</p>
                </div>
                <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                  team.averageScore >= 85 ? 'bg-green-100 text-green-800' :
                  team.averageScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {team.averageScore >= 85 ? 'Excellent' :
                   team.averageScore >= 70 ? 'Good' : 'Needs Improvement'}
                </div>
              </div>
            </div>
          ))}
        </div>
        {dashboardData.teamStats.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No team leaders assigned</p>
            <Button onClick={() => router.push("/admin/users")}>
              Add Team Leader
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => router.push("/admin/users")}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Add Team Leader
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push("/admin/reports")}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push("/sessions")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Manage Sessions
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push("/team-leader/scorecards")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Sessions</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/sessions")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentSessions.length > 0 ? (
                dashboardData.recentSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.agent.name}</p>
                        <span className="text-sm text-gray-500">with</span>
                        <p className="font-medium">{session.teamLeader.name}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500">
                          {format(new Date(session.sessionDate), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          session.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent sessions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}