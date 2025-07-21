"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Shield, Users, Settings, ChevronRight, Lock, Unlock } from "lucide-react";

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

export default function RolesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleData[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        const response = await fetch("/api/roles");
        if (!response.ok) {
          throw new Error("Failed to fetch roles");
        }
        const data = await response.json();
        setRoles(data);
      } catch (error) {
        console.error("Error fetching role data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && session?.user?.role === UserRole.ADMIN) {
      fetchRoleData();
    }
  }, [status, session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roles...</p>
        </div>
      </div>
    );
  }

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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-8 h-8" />;
      case 'MANAGER':
      case 'TEAM_LEADER':
      case 'AGENT':
        return <Users className="w-8 h-8" />;
      default:
        return <Users className="w-8 h-8" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
        <p className="text-gray-600 mt-2">
          Configure roles and permissions for system users
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((roleData) => (
          <div
            key={roleData.role}
            className={`bg-white rounded-lg shadow-sm border-2 ${getRoleColor(roleData.role)}`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${getRoleColor(roleData.role)}`}>
                    {getRoleIcon(roleData.role)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{roleData.displayName}</h2>
                    <p className="text-sm text-gray-600 mt-1">{roleData.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {roleData.userCount} {roleData.userCount === 1 ? 'user' : 'users'} with this role
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/roles/${roleData.role.toLowerCase()}/edit`)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Permissions</h3>
                <div className="space-y-2">
                  {roleData.permissions.slice(0, 3).map((permission) => (
                    <div key={permission.id} className="flex items-center gap-2">
                      {permission.enabled ? (
                        <Unlock className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700">{permission.name}</span>
                    </div>
                  ))}
                  {roleData.permissions.length > 3 && (
                    <button
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                      onClick={() => router.push(`/admin/roles/${roleData.role.toLowerCase()}/edit`)}
                    >
                      View all {roleData.permissions.length} permissions
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">About Role Management</h3>
        <p className="text-sm text-blue-800">
          Roles define what users can do within the system. Each role has specific permissions 
          that control access to features and data. Be careful when modifying roles as changes 
          will affect all users assigned to that role.
        </p>
      </div>
    </div>
  );
}