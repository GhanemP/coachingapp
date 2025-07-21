"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Plus,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer
} from "lucide-react";
import { format } from "date-fns";
import { UserRole, SessionStatus } from "@prisma/client";

interface Session {
  id: string;
  agentId: string;
  teamLeaderId: string;
  sessionDate: string;
  scheduledDate: string;
  status: SessionStatus;
  previousScore?: number;
  currentScore?: number;
  preparationNotes?: string;
  sessionNotes?: string;
  actionItems?: string;
  followUpDate?: string;
  duration?: number;
  agent: {
    id: string;
    name: string;
    email: string;
    agentProfile?: {
      employeeId: string;
    };
  };
  teamLeader: {
    id: string;
    name: string;
    email: string;
  };
}

const statusConfig = {
  [SessionStatus.SCHEDULED]: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-800",
    icon: Calendar
  },
  [SessionStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-800",
    icon: Timer
  },
  [SessionStatus.COMPLETED]: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle
  },
  [SessionStatus.CANCELLED]: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: XCircle
  },
  [SessionStatus.NO_SHOW]: {
    label: "No Show",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle
  }
};

export default function SessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch("/api/sessions");
        if (!response.ok) throw new Error("Failed to fetch sessions");
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchSessions();
    }
  }, [status]);

  const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
  const canCreateSession = session?.user?.role && allowedRoles.includes(session.user.role as UserRole);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coaching Sessions</h1>
          <p className="text-gray-600 mt-2">
            {session?.user?.role === UserRole.AGENT 
              ? "View your coaching sessions and progress"
              : "Manage and track coaching sessions with your team"}
          </p>
        </div>
        {canCreateSession && (
          <Button onClick={() => router.push("/sessions/templates")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Session Plan
          </Button>
        )}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-500">
              {canCreateSession 
                ? "Start by creating your first coaching session plan."
                : "You don't have any coaching sessions scheduled yet."}
            </p>
            {canCreateSession && (
              <Button 
                onClick={() => router.push("/sessions/templates")}
                className="mt-4"
              >
                Create Your First Session
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const StatusIcon = statusConfig[session.status].icon;
            let preparationData = null;
            
            // Safely parse preparation notes
            if (session.preparationNotes) {
              try {
                preparationData = JSON.parse(session.preparationNotes);
              } catch (error) {
                console.warn('Failed to parse preparation notes for session:', session.id);
                // If parsing fails, treat it as a simple string
                preparationData = { title: session.preparationNotes };
              }
            }
            
            return (
              <Card key={session.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {preparationData?.title || "Coaching Session"}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{session.agent.name}</span>
                          {session.agent.agentProfile?.employeeId && (
                            <span className="text-gray-400">({session.agent.agentProfile.employeeId})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(session.scheduledDate), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(session.scheduledDate), "h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={statusConfig[session.status].color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[session.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {preparationData?.objectives && preparationData.objectives.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Objectives</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {preparationData.objectives.slice(0, 2).map((objective: string, index: number) => (
                            <li key={index}>{objective}</li>
                          ))}
                          {preparationData.objectives.length > 2 && (
                            <li className="text-gray-400">
                              +{preparationData.objectives.length - 2} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {preparationData?.focusAreas && preparationData.focusAreas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Focus Areas</h4>
                        <div className="flex flex-wrap gap-2">
                          {preparationData.focusAreas.map((area: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <div className="text-sm text-gray-500">
                        Led by {session.teamLeader.name}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/sessions/${session.id}`)}
                      >
                        View Details
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}