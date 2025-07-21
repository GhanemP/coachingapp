"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Users, Shield, Database, Settings, ChevronRight, UserPlus, BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface AdminDashboardData {
  systemStats: {
    totalUsers: number;
    usersByRole: Array<{
      role: string;
      _count: number;
    }>;
    totalSessions: number;
    sessionsByStatus: Array<{
      status: string;
      _count: number;
    }>;
  };
  recentActivity: {
    sessions: Array<{
      id: string;
      createdAt: string;
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
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: string;
    }>;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
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

    if (status === "authenticated" && session?.user?.role === UserRole.ADMIN) {
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

  const getRoleCount = (role: string) => {
    const roleData = dashboardData.systemStats.usersByRole.find(r => r.role === role);
    return roleData?._count || 0;
  };

  const getStatusCount = (status: string) => {
    const statusData = dashboardData.systemStats.sessionsByStatus.find(s => s.status === status);
    return statusData?._count || 0;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          System Overview and Management
        </p>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={dashboardData.systemStats.totalUsers}
          unit="number"
          description="All system users"
        />
        <MetricCard
          title="Total Sessions"
          value={dashboardData.systemStats.totalSessions}
          unit="number"
          description="All coaching sessions"
        />
        <MetricCard
          title="Active Agents"
          value={getRoleCount('AGENT')}
          unit="number"
          description="Call center agents"
        />
        <MetricCard
          title="Completed Sessions"
          value={getStatusCount('COMPLETED')}
          unit="number"
          description="Successfully completed"
        />
      </div>

      {/* User Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">User Distribution by Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-blue-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{getRoleCount('ADMIN')}</p>
            <p className="text-sm text-gray-600">Admins</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-purple-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{getRoleCount('MANAGER')}</p>
            <p className="text-sm text-gray-600">Managers</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-green-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{getRoleCount('TEAM_LEADER')}</p>
            <p className="text-sm text-gray-600">Team Leaders</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-yellow-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{getRoleCount('AGENT')}</p>
            <p className="text-sm text-gray-600">Agents</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">System Management</h2>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start"
                onClick={() => router.push("/admin/users")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push("/admin/roles")}
              >
                <Shield className="w-4 h-4 mr-2" />
                Role Management
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push("/admin/reports")}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                System Reports
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push("/admin/settings")}
              >
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => router.push("/admin/database")}
              >
                <Database className="w-4 h-4 mr-2" />
                Database Management
              </Button>
            </div>
          </div>

          {/* Session Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Session Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Scheduled</span>
                <span className="font-medium">{getStatusCount('SCHEDULED')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="font-medium">{getStatusCount('IN_PROGRESS')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-medium">{getStatusCount('COMPLETED')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="font-medium">{getStatusCount('CANCELLED')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">No Show</span>
                <span className="font-medium">{getStatusCount('NO_SHOW')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Users</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentActivity.users.length > 0 ? (
                dashboardData.recentActivity.users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'MANAGER' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'TEAM_LEADER' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.role}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent users</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Sessions</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/sessions")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentActivity.sessions.length > 0 ? (
                dashboardData.recentActivity.sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.agent.name}</p>
                        <span className="text-sm text-gray-500">with</span>
                        <p className="font-medium">{session.teamLeader.name}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                      session.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
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