"use client";
// import { format } from "date-fns"; // Single top-level import // Unused import

// import { format } from "date-fns"; // Single top-level import // Unused import
import {
  StickyNote,
  Calendar,
  Users,
  Plus,
  FileText,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  ClipboardList
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

// import { QuickNotesList } from "@/components/quick-notes/quick-notes-list"; // Unused import
import { ActionItemsList } from "@/components/action-items/action-items-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedActivityView } from "@/components/unified-activity";
import { UserRole } from "@/lib/constants";

interface NoteType {
  id: string;
  title: string;
  createdAt: string;
}

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
    newField: string;
    metrics: Record<string, number>;
    notes: NoteType[]   | undefined; // Add notes property to agent type
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

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<TeamLeaderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      return; // Still loading, don't do anything
    }
    
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    
    if (status === "authenticated") {
      if (!session?.user?.role) {
        // Session exists but no role - redirect to login
        router.push("/?error=invalid_session");
        return;
      }
      
      if (session.user.role !== UserRole.TEAM_LEADER) {
        // User has a role but it's not TEAM_LEADER - redirect to appropriate dashboard
        switch (session.user.role) {
          case UserRole.ADMIN:
            router.push("/admin/dashboard");
            break;
          case UserRole.MANAGER:
            router.push("/manager/dashboard");
            break;
          case UserRole.AGENT:
            router.push("/agent/dashboard");
            break;
          default:
            router.push("/");
        }
        return;
      }
      
      // User is authenticated and has TEAM_LEADER role
      setIsCheckingAuth(false);
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

  if (status === "loading" || isCheckingAuth || loading) {
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

      {/* Action Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Quick Notes Box */}
        <Card className="bg-blue-100 hover:bg-blue-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/team-leader/quick-notes")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <StickyNote className="w-5 h-5" />
                Quick Notes
              </span>
              <Plus className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Document observations and feedback for your team members
            </p>
            <Button className="w-full" variant="outline" onClick={(e) => {
              e.stopPropagation();
              router.push("/team-leader/quick-notes");
            }}>
              View All Notes
            </Button>
          </CardContent>
        </Card>

        {/* Plan Session Box */}
        <Card className="bg-green-100 hover:bg-green-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/sessions/plan")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Plan Session
              </span>
              <Plus className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Schedule coaching sessions and create session plans
            </p>
            <Button className="w-full" variant="outline" onClick={(e) => {
              e.stopPropagation();
              router.push("/sessions/plan");
            }}>
              Create Plan
            </Button>
          </CardContent>
        </Card>

        {/* Agents Box */}
        <Card className="bg-gray-100 hover:bg-gray-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/agents")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Agents
              </span>
              <ChevronRight className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Access individual agent performance data and scorecards
            </p>
            <Button className="w-full" variant="outline" onClick={(e) => {
              e.stopPropagation();
              router.push("/agents");
            }}>
              View Agents
            </Button>
          </CardContent>
        </Card>

        {/* Coaching Sessions Box */}
        <Card className="bg-purple-100 hover:bg-purple-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/sessions")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Coaching Sessions
              </span>
              <ChevronRight className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              View and manage all coaching sessions
            </p>
            <Button className="w-full" variant="outline" onClick={(e) => {
              e.stopPropagation();
              router.push("/sessions");
            }}>
              View Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold">{dashboardData.teamStats.totalAgents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled Sessions</p>
                <p className="text-2xl font-bold">{dashboardData.teamStats.scheduledSessions}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Sessions</p>
                <p className="text-2xl font-bold">{dashboardData.teamStats.completedSessions}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Average Score</p>
                <p className="text-2xl font-bold">{dashboardData.teamStats.averageScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Activity View - Quick Notes and Sessions */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedActivityView limit={50} />
          </CardContent>
        </Card>
      </div>

      {/* Action Items Preview */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionItemsList showCreateButton={false} />
          </CardContent>
        </Card>
      </div>

    {/* Recent Activity Feed */}
    {/* Move component definition here */}
    {/* Removed duplicate component definition */}
    </div>
  );
}
