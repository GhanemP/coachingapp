"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, User, Users } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export default function NewSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    agentId: "",
    teamLeaderId: "",
    scheduledDate: "",
    scheduledTime: "",
    preparationNotes: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        
        // Filter users by role
        setAgents(data.filter((user: User) => user.role === UserRole.AGENT));
        setTeamLeaders(data.filter((user: User) => user.role === UserRole.TEAM_LEADER));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    if (status === "authenticated" && session?.user?.role === UserRole.ADMIN) {
      fetchUsers();
    }
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: formData.agentId,
          teamLeaderId: formData.teamLeaderId,
          scheduledDate: scheduledDateTime.toISOString(),
          preparationNotes: formData.preparationNotes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create session");
      }

      router.push("/admin/sessions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Get tomorrow's date as the minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/sessions")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sessions
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">Schedule New Session</h1>
        <p className="text-gray-600 mt-2">
          Create a new coaching session between an agent and team leader
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Agent Selection */}
          <div>
            <label htmlFor="agent" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Select Agent
            </label>
            <select
              id="agent"
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
          </div>

          {/* Team Leader Selection */}
          <div>
            <label htmlFor="teamLeader" className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Select Team Leader
            </label>
            <select
              id="teamLeader"
              value={formData.teamLeaderId}
              onChange={(e) => setFormData({ ...formData, teamLeaderId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a team leader...</option>
              {teamLeaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name} ({leader.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                id="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                min={minDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time
              </label>
              <input
                type="time"
                id="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Preparation Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Preparation Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.preparationNotes}
              onChange={(e) => setFormData({ ...formData, preparationNotes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any preparation notes or topics to discuss..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/sessions")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </form>
    </div>
  );
}