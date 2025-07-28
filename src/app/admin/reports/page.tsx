"use client";
import { format } from "date-fns";
import { BarChart3, TrendingUp, Users, Calendar, Download, Filter, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { usePermissions } from "@/hooks/use-permissions";
import logger from '@/lib/logger-client';


interface ReportData {
  overview: {
    totalSessions: number;
    completionRate: number;
    averageScore: number;
    activeAgents: number;
  };
  trends: {
    month: string;
    sessions: number;
    avgScore: number;
  }[];
  topPerformers: {
    id: string;
    name: string;
    score: number;
    sessions: number;
  }[];
}

export default function SystemReportsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("last30days");
  const [selectedReport, setSelectedReport] = useState("overview");

  // Helper function to get performer rank badge styles
  const getPerformerBadgeClass = (index: number): string => {
    if (index === 0) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (index === 1) {
      return 'bg-gray-100 text-gray-800';
    }
    return 'bg-orange-100 text-orange-800';
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && !permissionsLoading) {
      if (!hasPermission('view_reports')) {
        router.push("/dashboard");
      }
    }
  }, [status, hasPermission, permissionsLoading, router]);

  useEffect(() => {
    const fetchReportData = () => {
      try {
        // Mock data for demonstration
        const mockData: ReportData = {
          overview: {
            totalSessions: 45,
            completionRate: 87.5,
            averageScore: 82.3,
            activeAgents: 12,
          },
          trends: [
            { month: "Jan", sessions: 8, avgScore: 78 },
            { month: "Feb", sessions: 12, avgScore: 80 },
            { month: "Mar", sessions: 15, avgScore: 82 },
            { month: "Apr", sessions: 10, avgScore: 85 },
          ],
          topPerformers: [
            { id: "1", name: "John Doe", score: 92, sessions: 8 },
            { id: "2", name: "Jane Smith", score: 89, sessions: 6 },
            { id: "3", name: "Mike Johnson", score: 87, sessions: 7 },
          ],
        };
        
        setReportData(mockData);
        setLoading(false);
      } catch (error) {
        logger.error("Error fetching report data:", error as Error);
        setLoading(false);
      }
    };

    if (status === "authenticated" && !permissionsLoading && hasPermission('view_reports')) {
      fetchReportData();
    }
  }, [status, hasPermission, permissionsLoading, selectedPeriod]);

  if (status === "loading" || loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const reportTypes = [
    { id: "overview", name: "Overview", icon: BarChart3 },
    { id: "performance", name: "Performance", icon: TrendingUp },
    { id: "sessions", name: "Sessions", icon: Users },
    { id: "agents", name: "Agents", icon: Users },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Reports</h1>
            <p className="text-gray-600 mt-2">
              Analytics and insights for system performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select report period"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            <Calendar className="w-4 h-4 inline mr-1" />
            Report generated on {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedReport(type.id)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                    selectedReport === type.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Sessions"
          value={reportData.overview.totalSessions}
          unit="number"
          description="Coaching sessions conducted"
        />
        <MetricCard
          title="Completion Rate"
          value={reportData.overview.completionRate}
          unit="percentage"
          description="Sessions completed successfully"
        />
        <MetricCard
          title="Average Score"
          value={reportData.overview.averageScore}
          unit="score"
          description="Overall performance score"
        />
        <MetricCard
          title="Active Agents"
          value={reportData.overview.activeAgents}
          unit="number"
          description="Agents with recent sessions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Trends</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Chart visualization would go here</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {reportData.trends.map((trend) => (
              <div key={trend.month} className="text-center">
                <p className="text-sm text-gray-600">{trend.month}</p>
                <p className="text-lg font-semibold">{trend.sessions}</p>
                <p className="text-xs text-gray-500">Sessions</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
          <div className="space-y-4">
            {reportData.topPerformers.map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPerformerBadgeClass(index)}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{performer.name}</p>
                    <p className="text-sm text-gray-500">{performer.sessions} sessions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{performer.score}</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Agent Performance Report", description: "Detailed metrics for all agents" },
            { name: "Session Analytics", description: "Coaching session statistics and trends" },
            { name: "Team Comparison", description: "Performance comparison across teams" },
            { name: "Monthly Summary", description: "Monthly performance summary report" },
            { name: "KPI Dashboard", description: "Key performance indicators overview" },
            { name: "Custom Report", description: "Create a custom report with selected metrics" },
          ].map((report) => (
            <button
              key={report.name}
              className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              onClick={() => {/* Handle report generation */}}
            >
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{report.name}</p>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
