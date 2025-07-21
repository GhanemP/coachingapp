"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  FileText, 
  Upload, 
  Target,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Save,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { UserRole } from "@prisma/client";

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  currentScore?: number;
  previousScore?: number;
  metrics?: Record<string, number>;
  historicalScores?: Array<{
    date: string;
    score: number;
  }>;
}

interface SessionTemplate {
  agentId: string;
  title: string;
  objectives: string[];
  focusAreas: string[];
  actionItems: string[];
  attachments: File[];
  notes: string;
  scheduledDate: string;
  duration: number;
}

const METRIC_NAMES = {
  communication_skills: "Communication Skills",
  problem_resolution: "Problem Resolution",
  customer_service: "Customer Service",
  process_adherence: "Process Adherence",
  product_knowledge: "Product Knowledge",
  call_handling: "Call Handling",
  customer_satisfaction: "Customer Satisfaction",
  resolution_rate: "Resolution Rate"
};

export default function SessionTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMetrics, setNewMetrics] = useState<Record<string, number>>({});
  const [metricsEdited, setMetricsEdited] = useState(false);
  const [template, setTemplate] = useState<SessionTemplate>({
    agentId: "",
    title: "",
    objectives: [""],
    focusAreas: [],
    actionItems: [""],
    attachments: [],
    notes: "",
    scheduledDate: "",
    duration: 60
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.TEAM_LEADER && session?.user?.role !== UserRole.MANAGER && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        const data = await response.json();
        
        // Fetch metrics for each agent
        const agentsWithMetrics = await Promise.all(
          data.map(async (agent: Agent) => {
            try {
              const metricsResponse = await fetch(`/api/agents/${agent.id}/metrics`);
              if (metricsResponse.ok) {
                const metricsData = await metricsResponse.json();
                return {
                  ...agent,
                  currentScore: metricsData.overallScore,
                  previousScore: metricsData.historicalScores?.[1]?.score,
                  metrics: metricsData.currentMetrics,
                  historicalScores: metricsData.historicalScores
                };
              }
            } catch (error) {
              console.error(`Error fetching metrics for agent ${agent.id}:`, error);
            }
            return agent;
          })
        );
        
        setAgents(agentsWithMetrics);
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchAgents();
    }
  }, [status]);

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setSelectedAgent(agent || null);
    setTemplate(prev => ({ ...prev, agentId }));
    
    // Auto-populate focus areas based on low-scoring metrics
    if (agent?.metrics) {
      const lowScoringMetrics = Object.entries(agent.metrics)
        .filter(([, score]) => score < 70)
        .map(([metric]) => metric);
      setTemplate(prev => ({ ...prev, focusAreas: lowScoringMetrics }));
    }
  };

  const getTrendIcon = (current?: number, previous?: number) => {
    if (!current || !previous) return <Minus className="w-4 h-4 text-gray-400" />;
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendText = (current?: number, previous?: number) => {
    if (!current || !previous) return "No trend data";
    const diff = current - previous;
    if (diff > 0) return `+${diff.toFixed(1)}% improvement`;
    if (diff < 0) return `${diff.toFixed(1)}% decline`;
    return "No change";
  };

  // New metric handling functions
  const handleMetricChange = (metricKey: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setNewMetrics(prev => ({
      ...prev,
      [metricKey]: Math.min(100, Math.max(0, numValue)) // Clamp between 0-100
    }));
    setMetricsEdited(true);
  };

  const getCurrentMetricValue = (metricKey: string) => {
    return newMetrics[metricKey] !== undefined 
      ? newMetrics[metricKey] 
      : selectedAgent?.metrics?.[metricKey] || 0;
  };

  const getNewCurrentScore = () => {
    if (!selectedAgent?.metrics) return selectedAgent?.currentScore || 0;
    
    const allMetrics = { ...selectedAgent.metrics, ...newMetrics };
    const scores = Object.values(allMetrics);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  };

  const saveNewMetrics = async () => {
    if (!selectedAgent || Object.keys(newMetrics).length === 0) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: newMetrics,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }),
      });

      if (response.ok) {
        // Update the selected agent with new metrics
        const updatedAgent = {
          ...selectedAgent,
          previousScore: selectedAgent.currentScore,
          currentScore: getNewCurrentScore(),
          metrics: { ...selectedAgent.metrics, ...newMetrics }
        };
        setSelectedAgent(updatedAgent);
        setNewMetrics({});
        setMetricsEdited(false);
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...template.objectives];
    newObjectives[index] = value;
    setTemplate(prev => ({ ...prev, objectives: newObjectives }));
  };

  const addObjective = () => {
    setTemplate(prev => ({ ...prev, objectives: [...prev.objectives, ""] }));
  };

  const removeObjective = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const handleActionItemChange = (index: number, value: string) => {
    const newActionItems = [...template.actionItems];
    newActionItems[index] = value;
    setTemplate(prev => ({ ...prev, actionItems: newActionItems }));
  };

  const addActionItem = () => {
    setTemplate(prev => ({ ...prev, actionItems: [...prev.actionItems, ""] }));
  };

  const removeActionItem = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setTemplate(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeAttachment = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (isDraft: boolean = true) => {
    setSaving(true);
    try {
      // Create the session
      const sessionData = {
        agentId: template.agentId,
        scheduledDate: template.scheduledDate,
        preparationNotes: JSON.stringify({
          title: template.title,
          objectives: template.objectives.filter(o => o.trim()),
          focusAreas: template.focusAreas,
          actionItems: template.actionItems.filter(a => a.trim()),
          notes: template.notes
        }),
        duration: template.duration,
        status: isDraft ? "SCHEDULED" : "SCHEDULED"
      };

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) throw new Error("Failed to save session plan");

      router.push("/sessions");
    } catch (error) {
      console.error("Error saving session plan:", error);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/team-leader/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create Session Plan</h1>
        <p className="text-gray-600 mt-2">
          Plan and prepare for your next coaching session with data-driven insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Agent</CardTitle>
              <CardDescription>Choose the agent for this coaching session</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={template.agentId} onValueChange={handleAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{agent.name} ({agent.employeeId})</span>
                        {agent.currentScore && (
                          <Badge variant={agent.currentScore >= 85 ? "default" : agent.currentScore >= 70 ? "secondary" : "destructive"}>
                            {agent.currentScore}%
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedAgent && (
            <>
              {/* Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Performance Overview
                    {metricsEdited && (
                      <Button
                        onClick={saveNewMetrics}
                        disabled={saving}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Metrics"}
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Current performance and trends - Edit values to update metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Score</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            {getNewCurrentScore().toFixed(1)}%
                          </span>
                          {getTrendIcon(getNewCurrentScore(), selectedAgent.previousScore)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {getTrendText(getNewCurrentScore(), selectedAgent.previousScore)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Previous Score</span>
                        <span className="text-2xl font-bold">{selectedAgent.previousScore || "N/A"}%</span>
                      </div>
                      <p className="text-sm text-gray-500">From last session</p>
                    </div>
                  </div>

                  {/* Editable Metrics Breakdown */}
                  {selectedAgent.metrics && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">
                        Metrics Breakdown - {metricsEdited ? "Editing Mode" : "Click to Edit"}
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(selectedAgent.metrics).map(([metric]) => {
                          const currentValue = getCurrentMetricValue(metric);
                          const isEdited = newMetrics[metric] !== undefined;
                          
                          return (
                            <div key={metric} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 min-w-0 flex-1">
                                {METRIC_NAMES[metric as keyof typeof METRIC_NAMES] || metric}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      currentValue >= 85 ? "bg-green-500" : 
                                      currentValue >= 70 ? "bg-yellow-500" : "bg-red-500"
                                    } ${isEdited ? "ring-2 ring-blue-300" : ""}`}
                                    style={{ width: `${Math.min(100, Math.max(0, currentValue))}%` }}
                                  />
                                </div>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={currentValue}
                                  onChange={(e) => handleMetricChange(metric, e.target.value)}
                                  className={`w-16 h-8 text-sm text-center ${
                                    isEdited ? "border-blue-400 bg-blue-50" : ""
                                  }`}
                                />
                                <span className="text-xs text-gray-400 w-6">%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {metricsEdited && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <AlertCircle className="w-4 h-4" />
                            <span>You have unsaved changes. Click &quot;Save Metrics&quot; to update the performance data.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Session Title</Label>
                    <Input
                      id="title"
                      value={template.title}
                      onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Monthly Performance Review"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Scheduled Date</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        value={template.scheduledDate}
                        onChange={(e) => setTemplate(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={template.duration}
                        onChange={(e) => setTemplate(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        min="15"
                        max="120"
                        step="15"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Objectives */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Objectives</CardTitle>
                  <CardDescription>What do you want to achieve in this session?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {template.objectives.map((objective, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={objective}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        placeholder="Enter objective"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeObjective(index)}
                        disabled={template.objectives.length === 1}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addObjective} className="w-full">
                    Add Objective
                  </Button>
                </CardContent>
              </Card>

              {/* Focus Areas */}
              <Card>
                <CardHeader>
                  <CardTitle>Focus Areas</CardTitle>
                  <CardDescription>Areas that need improvement based on performance data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(METRIC_NAMES).map(([key, name]) => {
                      const score = selectedAgent.metrics?.[key] || 0;
                      const isSelected = template.focusAreas.includes(key);
                      const isLowScore = score < 70;
                      
                      return (
                        <Badge
                          key={key}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer ${isLowScore ? "border-red-300" : ""}`}
                          onClick={() => {
                            if (isSelected) {
                              setTemplate(prev => ({
                                ...prev,
                                focusAreas: prev.focusAreas.filter(f => f !== key)
                              }));
                            } else {
                              setTemplate(prev => ({
                                ...prev,
                                focusAreas: [...prev.focusAreas, key]
                              }));
                            }
                          }}
                        >
                          {name} ({score}%)
                          {isLowScore && <AlertCircle className="w-3 h-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Items</CardTitle>
                  <CardDescription>Specific tasks for the agent to work on</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {template.actionItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => handleActionItemChange(index, e.target.value)}
                        placeholder="Enter action item"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActionItem(index)}
                        disabled={template.actionItems.length === 1}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addActionItem} className="w-full">
                    Add Action Item
                  </Button>
                </CardContent>
              </Card>

              {/* Notes & Attachments */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes & Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={template.notes}
                      onChange={(e) => setTemplate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any additional notes or context for this session..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="attachments">Attachments</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX (MAX. 10MB)</p>
                          </div>
                          <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </div>
                      
                      {template.attachments.length > 0 && (
                        <div className="space-y-2">
                          {template.attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={saving || !template.agentId || !template.title || !template.scheduledDate}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving || !template.agentId || !template.title || !template.scheduledDate}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Schedule Session
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Planning Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Target className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Set Clear Objectives</p>
                  <p className="text-xs text-gray-500">Define 2-3 specific, measurable goals for the session</p>
                </div>
              </div>
              <div className="flex gap-2">
                <BarChart3 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Use Data Insights</p>
                  <p className="text-xs text-gray-500">Focus on metrics that show the most room for improvement</p>
                </div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Create Action Items</p>
                  <p className="text-xs text-gray-500">Assign specific tasks with clear deadlines</p>
                </div>
              </div>
              <div className="flex gap-2">
                <FileText className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Document Everything</p>
                  <p className="text-xs text-gray-500">Keep detailed notes for future reference and tracking</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Performance Chart */}
          {selectedAgent?.historicalScores && selectedAgent.historicalScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedAgent.historicalScores.slice(0, 5).map((score, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {format(new Date(score.date), "MMM yyyy")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score.score >= 85 ? "bg-green-500" : score.score >= 70 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${score.score}%` }}
                          />
                        </div>
                        <span className="font-medium w-12 text-right">{score.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}