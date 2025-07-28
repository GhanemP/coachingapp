"use client";
import { format } from "date-fns";
import {
  Calendar, Clock, Play,
  XCircle, AlertCircle, Save, Edit, ChevronLeft
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { UserRole, SessionStatus } from "@/lib/constants";
import { METRIC_LABELS, METRIC_DESCRIPTIONS } from "@/lib/metrics";

interface SessionDetail {
  id: string;
  scheduledDate: string;
  sessionDate: string;
  status: SessionStatus;
  duration: number;
  previousScore?: number;
  currentScore?: number;
  preparationNotes?: string;
  sessionNotes?: string;
  actionItems?: string;
  followUpDate?: string;
  agent: {
    id: string;
    name: string;
    email: string;
    agentProfile?: {
      employeeId: string;
      department: string;
    };
  };
  teamLeader: {
    id: string;
    name: string;
    email: string;
  };
  sessionMetrics: Array<{
    id: string;
    metricName: string;
    score: number;
    comments?: string;
  }>;
}

export default function AdminSessionDetailPage() {
  const { data: authSession, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [sessionData, setSessionData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [sessionNotes, setSessionNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [metrics, setMetrics] = useState<Record<string, { score: number; comments: string }>>({});

  // Helper function to get session status badge styles
  const getSessionStatusBadgeClass = (status: SessionStatus): string => {
    switch (status) {
      case SessionStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case SessionStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case SessionStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case SessionStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    } else if (authStatus === "authenticated" && authSession?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [authStatus, authSession, router]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch session");
        }
        const data = await response.json();
        setSessionData(data);
        
        // Initialize form states
        setSessionNotes(data.sessionNotes || "");
        setActionItems(data.actionItems || "");
        setFollowUpDate(data.followUpDate ? format(new Date(data.followUpDate), "yyyy-MM-dd") : "");
        
        // Initialize metrics
        const metricsData: Record<string, { score: number; comments: string }> = {};
        Object.keys(METRIC_LABELS).forEach((metricId) => {
          const existingMetric = data.sessionMetrics.find((m: { metricName: string }) => m.metricName === metricId);
          metricsData[metricId] = {
            score: existingMetric?.score || 0,
            comments: existingMetric?.comments || "",
          };
        });
        setMetrics(metricsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (authStatus === "authenticated" && authSession?.user?.role === UserRole.ADMIN && sessionId) {
      fetchSession();
    }
  }, [authStatus, authSession, sessionId]);

  const handleStatusChange = async (newStatus: SessionStatus) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update session status");
      }

      const updatedSession = await response.json();
      setSessionData(updatedSession);
      
      if (newStatus === SessionStatus.IN_PROGRESS) {
        setIsEditing(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Calculate overall score from metrics
      const metricScores = Object.entries(metrics).map(([, data]) => data.score);
      const overallScore = Math.round(
        metricScores.reduce((sum, score) => sum + score, 0) / metricScores.length
      );

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionNotes,
          actionItems,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
          currentScore: overallScore,
          metrics: Object.entries(metrics).map(([metricName, data]) => ({
            metricName,
            score: data.score,
            comments: data.comments,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save session");
      }

      const updatedSession = await response.json();
      setSessionData(updatedSession);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error || "Session not found"}</p>
          <Button onClick={() => router.push("/admin/sessions")} className="mt-4">
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/sessions")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Sessions
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coaching Session</h1>
            <p className="text-gray-600 mt-1">
              {sessionData.agent.name} with {sessionData.teamLeader.name}
            </p>
          </div>
        </div>
        
        {/* Admin Status Actions */}
        <div className="flex items-center gap-2">
          {sessionData.status === SessionStatus.SCHEDULED && (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusChange(SessionStatus.CANCELLED)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusChange(SessionStatus.IN_PROGRESS)}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </>
          )}
          {sessionData.status === SessionStatus.IN_PROGRESS && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel Edit
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Complete
                  </>
                )}
              </Button>
            </>
          )}
          {sessionData.status === SessionStatus.COMPLETED && !isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Session
            </Button>
          )}
          {sessionData.status === SessionStatus.COMPLETED && isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel Edit
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Session Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Session Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full mt-1 ${getSessionStatusBadgeClass(sessionData.status)}`}>
                  {sessionData.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{sessionData.duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled Date</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">
                    {format(new Date(sessionData.scheduledDate), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">
                    {format(new Date(sessionData.scheduledDate), "h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Agent Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{sessionData.agent.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Employee ID</p>
                <p className="font-medium">{sessionData.agent.agentProfile?.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{sessionData.agent.agentProfile?.department}</p>
              </div>
              {sessionData.previousScore && (
                <div>
                  <p className="text-sm text-gray-500">Previous Score</p>
                  <p className="font-medium">{sessionData.previousScore}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preparation Notes */}
      {sessionData.preparationNotes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Preparation Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{sessionData.preparationNotes}</p>
        </div>
      )}

      {/* Session Content - Editable when in progress or editing */}
      {(isEditing || sessionData.status === SessionStatus.IN_PROGRESS) ? (
        <>
          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(METRIC_LABELS).map(([metricId, metricName]) => (
                <div key={metricId} className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {metricName}
                    </label>
                    <p className="text-xs text-gray-500">{METRIC_DESCRIPTIONS[metricId as keyof typeof METRIC_DESCRIPTIONS]}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={metrics[metricId]?.score || 0}
                      onChange={(e) => setMetrics({
                        ...metrics,
                        [metricId]: {
                          ...metrics[metricId],
                          score: Number(e.target.value),
                        },
                      })}
                      className="flex-1"
                      aria-label={`${metricName} score`}
                    />
                    <span className="w-12 text-right font-medium">
                      {metrics[metricId]?.score || 0}
                    </span>
                  </div>
                  <textarea
                    placeholder="Comments (optional)"
                    value={metrics[metricId]?.comments || ""}
                    onChange={(e) => setMetrics({
                      ...metrics,
                      [metricId]: {
                        ...metrics[metricId],
                        comments: e.target.value,
                      },
                    })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Session Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Session Notes</h2>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document key discussion points, observations, and feedback..."
            />
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Action Items</h2>
            <textarea
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List specific action items for the agent to work on..."
            />
          </div>

          {/* Follow-up */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Follow-up</h2>
            <div>
              <label htmlFor="followup" className="block text-sm font-medium text-gray-700 mb-2">
                Next Session Date (optional)
              </label>
              <input
                type="date"
                id="followup"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Read-only view for completed sessions */}
          {sessionData.status === SessionStatus.COMPLETED && (
            <>
              {/* Performance Score */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white mb-6">
                <h2 className="text-2xl font-bold mb-2">Session Score</h2>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-bold">
                    {sessionData.currentScore || 0}
                  </span>
                  <span className="text-xl opacity-80">/ 100</span>
                </div>
                {sessionData.previousScore && (
                  <p className="mt-4 opacity-90">
                    Previous score: {sessionData.previousScore}% 
                    {sessionData.currentScore && sessionData.currentScore > sessionData.previousScore && (
                      <span className="ml-2">↑ +{sessionData.currentScore - sessionData.previousScore}%</span>
                    )}
                  </p>
                )}
              </div>

              {/* Metrics Breakdown */}
              {sessionData.sessionMetrics.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Performance Breakdown</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sessionData.sessionMetrics.map((metric) => {
                      const metricLabel = METRIC_LABELS[metric.metricName as keyof typeof METRIC_LABELS];
                      const metricDescription = METRIC_DESCRIPTIONS[metric.metricName as keyof typeof METRIC_DESCRIPTIONS];
                      return metricLabel ? (
                        <MetricCard
                          key={metric.id}
                          title={metricLabel}
                          value={metric.score}
                          unit="%"
                          target={80}
                          description={metric.comments || metricDescription}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Session Notes */}
              {sessionData.sessionNotes && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Session Notes</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{sessionData.sessionNotes}</p>
                </div>
              )}

              {/* Action Items */}
              {sessionData.actionItems && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Action Items</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{sessionData.actionItems}</p>
                </div>
              )}

              {/* Follow-up */}
              {sessionData.followUpDate && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">Follow-up</h2>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <p className="font-medium">
                      Next session scheduled for {format(new Date(sessionData.followUpDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}