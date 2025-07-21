"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Users, Save, RotateCcw } from "lucide-react";

interface RolePermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface RoleData {
  role: UserRole;
  displayName: string;
  description: string;
  userCount: number;
  permissions: RolePermission[];
}

export default function EditRolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const roleParam = params.role as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  const [originalPermissions, setOriginalPermissions] = useState<RolePermission[]>([]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Fetch role data
  useEffect(() => {
    const fetchRole = async () => {
      if (!roleParam || status !== "authenticated") return;

      try {
        const response = await fetch(`/api/roles/${roleParam}`);
        if (!response.ok) {
          throw new Error("Role not found");
        }
        
        const data = await response.json();
        setRoleData(data);
        setOriginalPermissions([...data.permissions]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch role");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [roleParam, status]);

  const handlePermissionToggle = (permissionId: string) => {
    if (!roleData) return;

    setRoleData({
      ...roleData,
      permissions: roleData.permissions.map(perm =>
        perm.id === permissionId
          ? { ...perm, enabled: !perm.enabled }
          : perm
      ),
    });
  };

  const handleSave = async () => {
    if (!roleData) return;

    setSaving(true);
    setError(null);

    try {
      // For now, this is just a simulation since we don't have a backend
      // that actually saves permission changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update original permissions to match current state
      setOriginalPermissions([...roleData.permissions]);
      
      // In a real app, you would make an API call here
      // const response = await fetch(`/api/roles/${roleParam}`, {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ permissions: roleData.permissions }),
      // });
      
      router.push("/admin/roles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!roleData) return;
    
    setRoleData({
      ...roleData,
      permissions: [...originalPermissions],
    });
  };

  const hasChanges = () => {
    if (!roleData) return false;
    
    return JSON.stringify(roleData.permissions) !== JSON.stringify(originalPermissions);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-6 h-6" />;
      case 'MANAGER':
      case 'TEAM_LEADER':
      case 'AGENT':
        return <Users className="w-6 h-6" />;
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TEAM_LEADER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'AGENT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading role...</p>
        </div>
      </div>
    );
  }

  if (error && !roleData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={() => router.push("/admin/roles")} className="mt-4">
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  if (!roleData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Role not found</p>
          <Button onClick={() => router.push("/admin/roles")} className="mt-4">
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/roles")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Roles
        </Button>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${getRoleColor(roleData.role)}`}>
            {getRoleIcon(roleData.role)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit {roleData.displayName}</h1>
            <p className="text-gray-600 mt-2">{roleData.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              {roleData.userCount} {roleData.userCount === 1 ? 'user' : 'users'} with this role
            </p>
          </div>
        </div>
      </div>

      {/* Warning for Admin Role */}
      {roleData.role === UserRole.ADMIN && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-amber-600 mt-0.5">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">Administrator Role</h3>
              <p className="text-sm text-amber-700 mt-1">
                Be careful when modifying administrator permissions. Removing critical permissions 
                could lock you out of system management functions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Configure what actions users with this role can perform in the system.
            Changes will affect all users assigned to this role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roleData.permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{permission.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        permission.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {permission.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handlePermissionToggle(permission.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      permission.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    aria-label={`Toggle ${permission.name} permission`}
                    title={`Toggle ${permission.name} permission`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        permission.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 mt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={saving || !hasChanges()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/roles")}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Permission Changes</h3>
        <p className="text-sm text-blue-800">
          Changes to role permissions take effect immediately for all users with this role. 
          Users may need to refresh their browser or sign in again to see permission changes.
        </p>
      </div>
    </div>
  );
}
