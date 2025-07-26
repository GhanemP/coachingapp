"use client";

import { useState } from "react";
import { Plus, X, Target, FileText, Link, Calendar, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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

interface StepPlanningDetailsProps {
  focusAreas: string[];
  actionItems: ActionItem[];
  notes: string;
  resources: Resource[];
  onUpdate: (updates: {
    focusAreas?: string[];
    actionItems?: ActionItem[];
    notes?: string;
    resources?: Resource[];
  }) => void;
  errors: Record<string, string>;
}

const FOCUS_AREA_OPTIONS = [
  { id: "performance", label: "Performance Improvement", icon: Target },
  { id: "quality", label: "Quality Enhancement", icon: AlertCircle },
  { id: "productivity", label: "Productivity Optimization", icon: Target },
  { id: "communication", label: "Communication Skills", icon: FileText },
  { id: "teamwork", label: "Team Collaboration", icon: Target },
  { id: "training", label: "Training & Development", icon: Lightbulb },
  { id: "attendance", label: "Attendance & Punctuality", icon: Calendar },
  { id: "customer-service", label: "Customer Service", icon: Target },
];

export function StepPlanningDetails({
  focusAreas,
  actionItems,
  notes,
  resources,
  onUpdate,
  errors,
}: StepPlanningDetailsProps) {
  const [showActionItemForm, setShowActionItemForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [newActionItem, setNewActionItem] = useState<ActionItem>({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // 7 days from now
  });
  const [newResource, setNewResource] = useState<Resource>({
    name: "",
    url: "",
    type: "document",
  });

  const toggleFocusArea = (areaId: string) => {
    const updated = focusAreas.includes(areaId)
      ? focusAreas.filter(id => id !== areaId)
      : [...focusAreas, areaId];
    onUpdate({ focusAreas: updated });
  };

  const addActionItem = () => {
    if (newActionItem.title && newActionItem.description) {
      onUpdate({ actionItems: [...actionItems, { ...newActionItem }] });
      setNewActionItem({
        title: "",
        description: "",
        priority: "MEDIUM",
        dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      });
      setShowActionItemForm(false);
    }
  };

  const removeActionItem = (index: number) => {
    onUpdate({ actionItems: actionItems.filter((_, i) => i !== index) });
  };

  const addResource = () => {
    if (newResource.name && newResource.url) {
      onUpdate({ resources: [...resources, { ...newResource }] });
      setNewResource({ name: "", url: "", type: "document" });
      setShowResourceForm(false);
    }
  };

  const removeResource = (index: number) => {
    onUpdate({ resources: resources.filter((_, i) => i !== index) });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-800 border-red-300";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
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

  return (
    <div className="space-y-6">
      {/* Focus Areas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Focus Areas
          <span className="text-sm font-normal text-gray-500">(Select at least one)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FOCUS_AREA_OPTIONS.map((area) => {
            const Icon = area.icon;
            const isSelected = focusAreas.includes(area.id);
            return (
              <button
                key={area.id}
                onClick={() => toggleFocusArea(area.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{area.label}</span>
                {isSelected && (
                  <div className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {errors.focusAreas && (
          <p className="text-sm text-red-600 mt-2">{errors.focusAreas}</p>
        )}
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Action Items
            <span className="text-sm font-normal text-gray-500">(SMART Goals)</span>
          </h2>
          <Button
            size="sm"
            onClick={() => setShowActionItemForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Action Item
          </Button>
        </div>

        {/* Action Items List */}
        <div className="space-y-3 mb-4">
          {actionItems.map((item, index) => (
            <div key={index} className={`p-4 rounded-lg border-2 ${getPriorityColor(item.priority)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-medium">Priority: {item.priority}</span>
                    <span>Due: {format(new Date(item.dueDate), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeActionItem(index)}
                  className="ml-4 text-gray-400 hover:text-red-600"
                  aria-label="Remove action item"
                  title="Remove action item"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Action Item Form */}
        {showActionItemForm && (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-3">New Action Item</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newActionItem.title}
                  onChange={(e) => setNewActionItem({ ...newActionItem, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Improve call handling time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newActionItem.description}
                  onChange={(e) => setNewActionItem({ ...newActionItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Specific, measurable details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newActionItem.priority}
                    onChange={(e) => setNewActionItem({ ...newActionItem, priority: e.target.value as "HIGH" | "MEDIUM" | "LOW" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Priority"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newActionItem.dueDate}
                    onChange={(e) => setNewActionItem({ ...newActionItem, dueDate: e.target.value })}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Due date"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addActionItem} size="sm">Add Item</Button>
                <Button
                  onClick={() => setShowActionItemForm(false)}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {errors.actionItems && (
          <p className="text-sm text-red-600 mt-2">{errors.actionItems}</p>
        )}
      </div>

      {/* Additional Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Additional Notes & Context
        </h2>
        <textarea
          value={notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Add any observations, context, or specific topics to discuss during the session..."
        />
        <p className="text-sm text-gray-500 mt-2">
          These notes will help you prepare for the session and ensure all important points are covered.
        </p>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link className="w-5 h-5" />
            Training Resources
            <span className="text-sm font-normal text-gray-500">(Optional)</span>
          </h2>
          <Button
            size="sm"
            onClick={() => setShowResourceForm(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </Button>
        </div>

        {/* Resources List */}
        <div className="space-y-2 mb-4">
          {resources.map((resource, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
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
              <button
                onClick={() => removeResource(index)}
                className="ml-4 text-gray-400 hover:text-red-600"
                aria-label="Remove resource"
                title="Remove resource"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Resource Form */}
        {showResourceForm && (
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">Add Resource</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Customer Service Best Practices"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={newResource.url}
                  onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newResource.type}
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Resource type"
                >
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="presentation">Presentation</option>
                  <option value="link">Web Link</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={addResource} size="sm" variant="outline">Add Resource</Button>
                <Button
                  onClick={() => setShowResourceForm(false)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}