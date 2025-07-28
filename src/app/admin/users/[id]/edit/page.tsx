"use client";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/lib/constants";



interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  managedBy: string | null;
  teamLeaderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SelectableUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export default function EditUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [managers, setManagers] = useState<SelectableUser[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<SelectableUser[]>([]);
  const [_agents, _setAgents] = useState<SelectableUser[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: UserRole.AGENT as UserRole,
    managedBy: "",
    teamLeaderId: "",
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId || status !== "authenticated") {return;}

      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error("User not found");
        }
        
        const userData = await response.json();
        setUser(userData);
        setFormData({
          name: userData.name,
          email: userData.email,
          password: "",
          confirmPassword: "",
          role: userData.role,
          managedBy: userData.managedBy || "",
          teamLeaderId: userData.teamLeaderId || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchUser();
  }, [userId, status]);

  // Fetch available users for assignments
  useEffect(() => {
    const fetchAssignmentOptions = async () => {
      if (status !== "authenticated") {return;}

      try {
        const response = await fetch("/api/users");
        if (!response.ok) {return;}
        
        const allUsers = await response.json();
        
        // Filter users by role for assignment options
        setManagers(allUsers.filter((u: SelectableUser) => u.role === UserRole.MANAGER && u.id !== userId));
        setTeamLeaders(allUsers.filter((u: SelectableUser) => u.role === UserRole.TEAM_LEADER && u.id !== userId));
        _setAgents(allUsers.filter((u: SelectableUser) => u.role === UserRole.AGENT && u.id !== userId));
      } catch (err) {
        console.error("Failed to fetch assignment options:", err);
      }
    };

    fetchAssignmentOptions();
  }, [userId, status]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name || !formData.email) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const updateData: {
        name: string;
        email: string;
        role: UserRole;
        password?: string;
        managedBy?: string | null;
        teamLeaderId?: string | null;
      } = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        managedBy: formData.managedBy || null,
        teamLeaderId: formData.teamLeaderId || null,
      };

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'User updated successfully';
      document.body.appendChild(successDiv);
      
      // Redirect after showing message
      setTimeout(() => {
        successDiv.remove();
        router.push("/admin/users");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'User deleted successfully';
      document.body.appendChild(successDiv);
      
      // Redirect after showing message
      setTimeout(() => {
        successDiv.remove();
        router.push("/admin/users");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (status === "loading" || fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={() => router.push("/admin/users")} className="mt-4">
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/users")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        <p className="text-gray-600 mt-2">
          Update user account information
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Update the user account details. Leave password blank to keep current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select user role"
                required
              >
                <option value={UserRole.AGENT}>Agent</option>
                <option value={UserRole.TEAM_LEADER}>Team Leader</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>

            {/* Hierarchical Assignment Fields */}
            {formData.role === UserRole.AGENT && (
              <div className="space-y-2">
                <Label htmlFor="teamLeaderId">Team Leader</Label>
                <select
                  id="teamLeaderId"
                  name="teamLeaderId"
                  value={formData.teamLeaderId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select team leader"
                >
                  <option value="">No Team Leader</option>
                  {teamLeaders.map(tl => (
                    <option key={tl.id} value={tl.id}>
                      {tl.name} ({tl.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Assign this agent to a team leader for coaching and management.
                </p>
              </div>
            )}

            {formData.role === UserRole.TEAM_LEADER && (
              <div className="space-y-2">
                <Label htmlFor="managedBy">Manager</Label>
                <select
                  id="managedBy"
                  name="managedBy"
                  value={formData.managedBy}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select manager"
                >
                  <option value="">No Manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Assign this team leader to a manager for oversight and reporting.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating User...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/users")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Delete Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-red-800 mb-2">Danger Zone</h3>
              <p className="text-red-700 text-sm mb-4">
                Deleting a user will permanently remove their account and all associated data. This action cannot be undone.
              </p>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || userId === session?.user?.id}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </Button>
              {userId === session?.user?.id && (
                <p className="text-xs text-red-600 mt-2">
                  You cannot delete your own account.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
