"use client";

import { format, addDays, isSameDay, isAfter, isBefore } from "date-fns";
import { Calendar, Clock, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

import logger from '@/lib/logger-client';

interface StepSchedulingProps {
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  sessionTitle: string;
  agentId: string;
  onUpdate: (updates: {
    scheduledDate?: string;
    scheduledTime?: string;
    duration?: number;
    sessionTitle?: string;
  }) => void;
  errors: Record<string, string>;
}

interface ExistingSession {
  id: string;
  scheduledDate: string;
  duration: number;
  agent: {
    name: string;
  };
}

const SESSION_TITLE_TEMPLATES = [
  "Weekly Performance Review - {agentName}",
  "Monthly Coaching Session - {agentName}",
  "Performance Improvement Plan Review - {agentName}",
  "Skills Development Session - {agentName}",
  "Goal Setting & Review - {agentName}",
  "Quality Improvement Discussion - {agentName}",
  "Career Development Meeting - {agentName}",
];

export function StepScheduling({
  scheduledDate,
  scheduledTime,
  duration,
  sessionTitle,
  agentId,
  onUpdate,
  errors,
}: StepSchedulingProps) {
  const [agentName, setAgentName] = useState("");
  const [conflicts, setConflicts] = useState<ExistingSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate time slots (every 30 minutes from 8 AM to 6 PM)
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(time);
    }
  }

  // Get min and max dates
  const minDate = format(new Date(), "yyyy-MM-dd");
  const maxDate = format(addDays(new Date(), 30), "yyyy-MM-dd");

  // Fetch agent name
  useEffect(() => {
    if (agentId) {
      fetch(`/api/agents/${agentId}`)
        .then(res => res.json())
        .then(data => {
          if (data.user?.name) {
            setAgentName(data.user.name);
          }
        })
        .catch(logger.error);
    }
  }, [agentId]);

  // Check for conflicts when date/time changes
  useEffect(() => {
    if (scheduledDate && scheduledTime) {
      checkConflicts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, scheduledTime, duration]);

  const checkConflicts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        const sessions = data.sessions || data; // Handle both response formats

        // Check for conflicts
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const scheduledEndTime = new Date(scheduledDateTime.getTime() + duration * 60000);

        const conflictingSessions = sessions.filter((session: ExistingSession) => {
          const sessionStart = new Date(session.scheduledDate);
          const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);

          // Check if sessions overlap
          return (
            (isAfter(scheduledDateTime, sessionStart) && isBefore(scheduledDateTime, sessionEnd)) ||
            (isAfter(scheduledEndTime, sessionStart) && isBefore(scheduledEndTime, sessionEnd)) ||
            (isBefore(scheduledDateTime, sessionStart) && isAfter(scheduledEndTime, sessionEnd)) ||
            isSameDay(scheduledDateTime, sessionStart)
          );
        });

        setConflicts(conflictingSessions);
      }
    } catch (error) {
      logger.error("Failed to check conflicts:", error as Error);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: string) => {
    const title = template.replace("{agentName}", agentName || "Agent");
    onUpdate({ sessionTitle: title });
  };

  const getAvailabilityStatus = () => {
    if (!scheduledDate || !scheduledTime) {return null;}
    if (loading) {return { type: "loading", message: "Checking availability..." };}
    if (conflicts.length === 0) {return { type: "available", message: "Time slot is available" };}
    return { type: "conflict", message: `${conflicts.length} potential conflict(s) detected` };
  };

  const getAvailabilityStatusClass = (type: string) => {
    switch (type) {
      case "available": return "bg-green-50 text-green-800 border border-green-200";
      case "conflict": return "bg-yellow-50 text-yellow-800 border border-yellow-200";
      default: return "bg-gray-50 text-gray-600 border border-gray-200";
    }
  };

  const availabilityStatus = getAvailabilityStatus();

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Select Date
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Session Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              value={scheduledDate}
              onChange={(e) => onUpdate({ scheduledDate: e.target.value })}
              min={minDate}
              max={maxDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.date && (
              <p className="text-sm text-red-600 mt-1">{errors.date}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              You can schedule sessions up to 30 days in advance
            </p>
          </div>
        </div>
      </div>

      {/* Time Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Select Time & Duration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <select
              id="time"
              value={scheduledTime}
              onChange={(e) => onUpdate({ scheduledTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select time</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.time && (
              <p className="text-sm text-red-600 mt-1">{errors.time}</p>
            )}
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => onUpdate({ duration: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes (Recommended)</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>
        </div>

        {/* Availability Status */}
        {availabilityStatus && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${getAvailabilityStatusClass(availabilityStatus.type)}`}>
            {availabilityStatus.type === "available" && <CheckCircle className="w-5 h-5" />}
            {availabilityStatus.type === "conflict" && <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{availabilityStatus.message}</span>
          </div>
        )}

        {/* Show conflicts if any */}
        {conflicts.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Potential conflicts:</p>
            {conflicts.map((session) => (
              <div key={session.id} className="text-sm text-gray-600 pl-4">
                • {format(new Date(session.scheduledDate), "h:mm a")} - {session.agent.name} ({session.duration} min)
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Title */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Session Title
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={sessionTitle}
              onChange={(e) => onUpdate({ sessionTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a descriptive title for the session"
              required
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Title Templates */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
            <div className="flex flex-wrap gap-2">
              {SESSION_TITLE_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  onClick={() => applyTemplate(template)}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                  type="button"
                >
                  {template.replace("{agentName}", "...")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Session Summary */}
      {scheduledDate && scheduledTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Session Preview
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {format(new Date(`${scheduledDate}T${scheduledTime}`), "EEEE, MMMM d, yyyy")}
            </p>
            <p>
              <span className="font-medium">Time:</span>{" "}
              {format(new Date(`${scheduledDate}T${scheduledTime}`), "h:mm a")} - 
              {format(new Date(new Date(`${scheduledDate}T${scheduledTime}`).getTime() + duration * 60000), "h:mm a")}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {duration} minutes
            </p>
            {sessionTitle && (
              <p>
                <span className="font-medium">Title:</span> {sessionTitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}