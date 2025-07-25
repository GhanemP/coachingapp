"use client";
import { format } from "date-fns"; // Single top-level import
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StickyNote,
  Calendar,
  Users,
  Plus,
  FileText,
  TrendingUp,
  Clock,
  User,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { QuickNotesList } from "@/components/quick-notes/quick-notes-list";
import { ActionItemsList } from "@/components/action-items/action-items-list";
import { UnifiedActivityView } from "@/components/unified-activity/unified-activity-view";

interface NoteType {
  id: string;
  title: string;
  createdAt: string;
}

interface SessionType {
  id: string;
  agent: { name: string };
  sessionDate: string;
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
    notes: NoteType[] | undefined; // Add notes property to agent type
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

      {/* Action Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <Card className="bg-green-100 hover:bg-green-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/sessions/templates")}>
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
              router.push("/sessions/templates");
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
        <UnifiedActivityView showCreateButton={false} />
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

interface SessionType {
  id: string;
  agent: { name: string };
  sessionDate: string;
}

interface NoteType {
  id: string;
  title: string;
  createdAt: string;
}

interface CombinedActivityTableProps {
  sessions: SessionType[];
  notes: NoteType[];
}

const CombinedActivityTable = ({ sessions, notes }: CombinedActivityTableProps) => {
  const router = useRouter();
  const combinedItems = [
    ...sessions.map(session => ({
      type: "session",
      id: session.id,
      title: `Session with ${session.agent.name}`,
      date: new Date(session.sessionDate),
      icon: <Calendar className="w-4 h-4 text-blue-500" />,
      color: "bg-blue-50",
      onClick: () => router.push(`/sessions/${session.id}`)
    })),
    ...notes.map(note => ({
      type: "note",
      id: note.id,
      title: note.title,
      date: new Date(note.createdAt),
      icon: <StickyNote className="w-4 h-4 text-gray-500" />,
      color: "bg-gray-100",
      onClick: () => router.push(`/quick-notes/${note.id}`)
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {combinedItems.map(item => (
            <div
              key={item.id}
              className={`flex items-center p-4 rounded-lg ${item.color} hover:bg-slate-100 cursor-pointer`}
              onClick={item.onClick}
            >
              <div className="flex-shrink-0 mr-4">{item.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {format(item.date, "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
}