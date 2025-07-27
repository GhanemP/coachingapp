"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { getMetricById } from "@/lib/metrics";
import { Calendar, Clock, User, TrendingUp, CheckSquare } from "lucide-react";
import { format } from "date-fns";


interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    employeeId: string;
    department: string;
    teamLeader: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  metrics: {
    current: Record<string, number>;
    overallScore: number;
  };
  upcomingSessions: Array<{
    id: string;
    scheduledDate: string;
    teamLeader: {
      id: string;
      name: string;
    };
  }>;
  recentSessions: Array<{
    id: string;
    sessionDate: string;
    status: string;
    currentScore: number | null;
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

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role !== "AGENT") {
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

    if (status === "authenticated" && session?.user?.role === "AGENT") {
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
        <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {dashboardData.user.name}
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Employee ID</p>
            <p className="font-semibold">{dashboardData.user.employeeId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Department</p>
            <p className="font-semibold">{dashboardData.user.department}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Team Leader</p>
            <p className="font-semibold">
              {dashboardData.user.teamLeader?.name || "Not assigned"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button
          variant="outline"
          className="h-auto p-6 flex flex-col items-center gap-2 hover:bg-gray-50"
          onClick={() => router.push('/agent/action-items')}
        >
          <CheckSquare className="w-8 h-8 text-blue-600" />
          <span className="font-semibold">My Action Items</span>
          <span className="text-sm text-gray-600">View assigned tasks</span>
        </Button>
      </div>

      {/* Overall Score */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Overall Performance Score</h2>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-bold">
              {dashboardData.metrics.overallScore}
            </span>
            <span className="text-xl opacity-80">/ 100</span>
          </div>
          <p className="mt-4 opacity-90">
            Based on your performance across all 8 key metrics
          </p>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(dashboardData.metrics.current).map(([metricId, score]) => {
            const metric = getMetricById(metricId);
            if (!metric) return null;
            
            return (
              <MetricCard
                key={metricId}
                title={metric.name}
                value={score}
                unit={metric.unit}
                target={metric.target}
                description={metric.description}
              />
            );
          })}
        </div>
      </div>

      {/* Sessions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Sessions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
          <div className="space-y-3">
            {dashboardData.upcomingSessions.length > 0 ? (
              dashboardData.upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(session.scheduledDate), "PPP")}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(session.scheduledDate), "p")}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <User className="w-4 h-4" />
                        {session.teamLeader.name}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No upcoming sessions scheduled
              </p>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
          <div className="space-y-3">
            {dashboardData.recentSessions.length > 0 ? (
              dashboardData.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(session.sessionDate), "PPP")}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <User className="w-4 h-4" />
                        {session.teamLeader.name}
                      </div>
                    </div>
                    {session.currentScore && (
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-lg">
                            {session.currentScore}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Score</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No recent sessions
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
