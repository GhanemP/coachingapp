"use client";

import { User, Calendar, Clock, Target, FileText, Link, Edit2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface ActionItem {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
}

interface Resource {
  name: string;
  url: string;
  type: string;
}

interface SessionPlanData {
  agentId: string;
  focusAreas: string[];
  actionItems: ActionItem[];
  notes: string;
  resources: Resource[];
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  sessionTitle: string;
}

interface StepReviewConfirmProps {
  sessionData: SessionPlanData;
  onEdit: (step: number) => void;
  errors: Record<string, string>;
}

const FOCUS_AREA_LABELS: Record<string, string> = {
  "performance": "Performance Improvement",
  "quality": "Quality Enhancement",
  "productivity": "Productivity Optimization",
  "communication": "Communication Skills",
  "teamwork": "Team Collaboration",
  "training": "Training & Development",
  "attendance": "Attendance & Punctuality",
  "customer-service": "Customer Service",
};

export function StepReviewConfirm({ sessionData, onEdit, errors }: StepReviewConfirmProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "LOW": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video": return "🎥";
      case "document": return "📄";
      case "link": return "🔗";
      case "presentation": return "📊";
      default: return "📎";
    }
  };

  const scheduledDateTime = sessionData.scheduledDate && sessionData.scheduledTime
    ? new Date(`${sessionData.scheduledDate}T${sessionData.scheduledTime}`)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-green-900">Review Session Details</h2>
        </div>
        <p className="text-green-800">
          Please review all the details below before confirming the session. You can click on any section to make changes.
        </p>
      </div>

      {/* Session Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Session Overview
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(3)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Title</p>
            <p className="font-medium text-gray-900">{sessionData.sessionTitle || "No title set"}</p>
          </div>
          {scheduledDateTime && (
            <>
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium text-gray-900">
                  {format(scheduledDateTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium text-gray-900">{sessionData.duration} minutes</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Focus Areas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Focus Areas ({sessionData.focusAreas.length})
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(2)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sessionData.focusAreas.map((area) => (
            <span
              key={area}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              {FOCUS_AREA_LABELS[area] || area}
            </span>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Action Items ({sessionData.actionItems.length})
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(2)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        </div>
        {sessionData.actionItems.length > 0 ? (
          <div className="space-y-3">
            {sessionData.actionItems.map((item, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-sm text-gray-600">
                        Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No action items added</p>
        )}
      </div>

      {/* Notes */}
      {sessionData.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Session Notes
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(2)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{sessionData.notes}</p>
        </div>
      )}

      {/* Resources */}
      {sessionData.resources.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Link className="w-5 h-5" />
              Training Resources ({sessionData.resources.length})
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(2)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          </div>
          <div className="space-y-2">
            {sessionData.resources.map((resource, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                <div>
                  <p className="font-medium text-gray-900">{resource.name}</p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {resource.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Pre-flight Check
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              sessionData.agentId ? "bg-green-500" : "bg-gray-300"
            }`}>
              {sessionData.agentId && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={sessionData.agentId ? "text-green-700" : "text-gray-500"}>
              Agent selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              sessionData.focusAreas.length > 0 ? "bg-green-500" : "bg-gray-300"
            }`}>
              {sessionData.focusAreas.length > 0 && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={sessionData.focusAreas.length > 0 ? "text-green-700" : "text-gray-500"}>
              Focus areas defined ({sessionData.focusAreas.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              sessionData.actionItems.length > 0 ? "bg-green-500" : "bg-gray-300"
            }`}>
              {sessionData.actionItems.length > 0 && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={sessionData.actionItems.length > 0 ? "text-green-700" : "text-gray-500"}>
              Action items created ({sessionData.actionItems.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              sessionData.scheduledDate && sessionData.scheduledTime ? "bg-green-500" : "bg-gray-300"
            }`}>
              {sessionData.scheduledDate && sessionData.scheduledTime && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={sessionData.scheduledDate && sessionData.scheduledTime ? "text-green-700" : "text-gray-500"}>
              Date and time scheduled
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              sessionData.sessionTitle ? "bg-green-500" : "bg-gray-300"
            }`}>
              {sessionData.sessionTitle && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={sessionData.sessionTitle ? "text-green-700" : "text-gray-500"}>
              Session title provided
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium mb-2">Please fix the following issues:</p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-900 font-medium mb-2">
          Ready to create this coaching session?
        </p>
        <p className="text-blue-700 text-sm">
          Once created, the session will be scheduled and both you and the agent will receive notifications.
          You can still modify session details after creation.
        </p>
      </div>
    </div>
  );
}