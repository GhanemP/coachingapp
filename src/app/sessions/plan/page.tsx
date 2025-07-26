"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Save, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/tooltip";

// Import step components
import { StepAgentReview } from "@/components/session-planning/StepAgentReview";
import { StepPlanningDetails } from "@/components/session-planning/StepPlanningDetails";
import { StepScheduling } from "@/components/session-planning/StepScheduling";
import { StepReviewConfirm } from "@/components/session-planning/StepReviewConfirm";

// Types
interface SessionPlanData {
  agentId: string;
  focusAreas: string[];
  actionItems: Array<{
    title: string;
    description: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    dueDate: string;
  }>;
  notes: string;
  resources: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  sessionTitle: string;
}

const STEPS = [
  { id: 1, name: "Agent Review", description: "Review performance & history" },
  { id: 2, name: "Planning Details", description: "Set focus areas & action items" },
  { id: 3, name: "Schedule Session", description: "Pick date, time & duration" },
  { id: 4, name: "Review & Confirm", description: "Finalize session details" },
];

export default function SessionPlanningWorkflow() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionData, setSessionData] = useState<SessionPlanData>({
    agentId: "",
    focusAreas: [],
    actionItems: [],
    notes: "",
    resources: [],
    scheduledDate: "",
    scheduledTime: "",
    duration: 60,
    sessionTitle: "",
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check authentication and authorization
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.TEAM_LEADER) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!sessionData.agentId) return;
    
    setIsAutoSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem("sessionPlanDraft", JSON.stringify({
        data: sessionData,
        step: currentStep,
        timestamp: new Date().toISOString(),
      }));
      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [sessionData, currentStep]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("sessionPlanDraft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setSessionData(parsed.data);
        setCurrentStep(parsed.step);
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, []);

  // Update session data
  const updateSessionData = (updates: Partial<SessionPlanData>) => {
    setSessionData(prev => ({ ...prev, ...updates }));
  };

  // Validate current step - separated into two functions to avoid state updates during render
  const getStepErrors = (step: number): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!sessionData.agentId) {
          newErrors.agent = "Please select an agent";
        }
        break;
      case 2:
        if (sessionData.focusAreas.length === 0) {
          newErrors.focusAreas = "Please select at least one focus area";
        }
        if (sessionData.actionItems.length === 0) {
          newErrors.actionItems = "Please create at least one action item";
        }
        break;
      case 3:
        if (!sessionData.scheduledDate) {
          newErrors.date = "Please select a date";
        }
        if (!sessionData.scheduledTime) {
          newErrors.time = "Please select a time";
        }
        if (!sessionData.sessionTitle) {
          newErrors.title = "Please enter a session title";
        }
        break;
    }

    return newErrors;
  };

  const validateStep = (step: number): boolean => {
    const newErrors = getStepErrors(step);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if step is valid without updating state (for render-time checks)
  const isStepValid = (step: number): boolean => {
    const stepErrors = getStepErrors(step);
    return Object.keys(stepErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
      autoSave();
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (stepId: number) => {
    if (stepId < currentStep) {
      setCurrentStep(stepId);
    } else if (stepId > currentStep && validateStep(currentStep)) {
      setCurrentStep(stepId);
    }
  };

  // Submit session
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${sessionData.scheduledDate}T${sessionData.scheduledTime}`);
      
      // Create session
      const sessionResponse = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: sessionData.agentId,
          scheduledDate: scheduledDateTime.toISOString(),
          duration: sessionData.duration,
          preparationNotes: sessionData.notes,
          title: sessionData.sessionTitle,
          focusAreas: sessionData.focusAreas,
          resources: sessionData.resources,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create session");
      }

      const newSession = await sessionResponse.json();

      // Create action items
      for (const item of sessionData.actionItems) {
        await fetch("/api/action-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item,
            agentId: sessionData.agentId,
            sessionId: newSession.id,
          }),
        });
      }

      // Clear draft
      localStorage.removeItem("sessionPlanDraft");

      // Redirect to session details
      router.push(`/sessions/${newSession.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      setErrors({ submit: "Failed to create session. Please try again." });
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Plan Coaching Session</h1>
              <HelpTooltip content="Follow this step-by-step workflow to create a comprehensive coaching session plan with performance insights, action items, and scheduling." />
            </div>
            {lastSaved && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Save className="w-4 h-4" />
                {isAutoSaving ? "Saving..." : `Last saved ${lastSaved.toLocaleTimeString()}`}
              </div>
            )}
          </div>

          {/* Step Indicators */}
          <nav aria-label="Progress" className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex-1 relative",
                  index < STEPS.length - 1 && "after:content-[''] after:absolute after:top-5 after:left-[50%] after:w-full after:h-0.5 after:bg-gray-300"
                )}
              >
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-2 w-full",
                    currentStep >= step.id ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                  disabled={step.id > currentStep && !isStepValid(currentStep)}
                  aria-current={currentStep === step.id ? "step" : undefined}
                  aria-label={`Step ${step.id}: ${step.name} - ${step.description}`}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                      currentStep === step.id
                        ? "bg-blue-600 text-white"
                        : currentStep > step.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-300 text-gray-600"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "font-medium text-sm",
                      currentStep === step.id ? "text-blue-600" : "text-gray-600"
                    )}>
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                  </div>
                </button>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Step Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Help Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tips for effective session planning:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Review recent performance metrics and notes before setting focus areas</li>
                <li>Create SMART action items (Specific, Measurable, Achievable, Relevant, Time-bound)</li>
                <li>Schedule sessions during times when both parties can focus without interruptions</li>
                <li>Your progress is automatically saved every 30 seconds</li>
              </ul>
            </div>
          </div>

          {currentStep === 1 && (
            <StepAgentReview
              selectedAgentId={sessionData.agentId}
              onAgentSelect={(agentId) => updateSessionData({ agentId })}
              errors={errors}
            />
          )}
          {currentStep === 2 && (
            <StepPlanningDetails
              focusAreas={sessionData.focusAreas}
              actionItems={sessionData.actionItems}
              notes={sessionData.notes}
              resources={sessionData.resources}
              onUpdate={updateSessionData}
              errors={errors}
            />
          )}
          {currentStep === 3 && (
            <StepScheduling
              scheduledDate={sessionData.scheduledDate}
              scheduledTime={sessionData.scheduledTime}
              duration={sessionData.duration}
              sessionTitle={sessionData.sessionTitle}
              agentId={sessionData.agentId}
              onUpdate={updateSessionData}
              errors={errors}
            />
          )}
          {currentStep === 4 && (
            <StepReviewConfirm
              sessionData={sessionData}
              onEdit={(step) => setCurrentStep(step)}
              errors={errors}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Create Session
              </Button>
            )}
          </div>

          {errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {errors.submit}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}