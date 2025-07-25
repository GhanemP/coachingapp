import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { UserRole } from "@/lib/constants";

interface UsePermissionsReturn {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  permissions: string[];
  loading: boolean;
  error: Error | null;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (status === "loading") return;
      
      if (status === "unauthenticated" || !session?.user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/users/permissions");
        if (!response.ok) {
          throw new Error("Failed to fetch permissions");
        }
        
        const data = await response.json();
        setPermissions(data.permissions || []);
      } catch (err) {
        console.error("Error fetching permissions:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        
        // Fallback to role-based permissions for now
        setPermissions(getRoleBasedPermissions(session.user.role));
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [session, status]);

  const hasPermission = (permission: string): boolean => {
    // Admin has all permissions
    if (session?.user?.role === UserRole.ADMIN) {
      return true;
    }
    
    // Check if user has the specific permission
    return permissions.includes(permission.toUpperCase());
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    loading: loading || status === "loading",
    error,
  };
}

// Temporary fallback function until the API endpoint is created
function getRoleBasedPermissions(role: string): string[] {
  switch (role) {
    case UserRole.ADMIN:
      return [
        'VIEW_USERS', 'CREATE_USERS', 'UPDATE_USERS', 'DELETE_USERS', 'MANAGE_USERS',
        'VIEW_ROLES', 'MANAGE_ROLES', 'MANAGE_PERMISSIONS',
        'VIEW_SCORECARDS', 'CREATE_SCORECARDS', 'UPDATE_SCORECARDS', 'DELETE_SCORECARDS',
        'VIEW_AGENTS', 'CREATE_AGENTS', 'UPDATE_AGENTS', 'DELETE_AGENTS',
        'VIEW_QUICK_NOTES', 'CREATE_QUICK_NOTES', 'UPDATE_QUICK_NOTES', 'DELETE_QUICK_NOTES',
        'VIEW_ACTION_ITEMS', 'CREATE_ACTION_ITEMS', 'UPDATE_ACTION_ITEMS', 'DELETE_ACTION_ITEMS',
        'VIEW_SESSIONS', 'CREATE_SESSIONS', 'UPDATE_SESSIONS', 'DELETE_SESSIONS',
      ];
    case UserRole.MANAGER:
      return [
        'VIEW_USERS', 'VIEW_ROLES',
        'VIEW_SCORECARDS', 'CREATE_SCORECARDS', 'UPDATE_SCORECARDS', 'DELETE_SCORECARDS',
        'VIEW_AGENTS', 'CREATE_AGENTS', 'UPDATE_AGENTS',
        'VIEW_QUICK_NOTES', 'CREATE_QUICK_NOTES', 'UPDATE_QUICK_NOTES', 'DELETE_QUICK_NOTES',
        'VIEW_ACTION_ITEMS', 'CREATE_ACTION_ITEMS', 'UPDATE_ACTION_ITEMS', 'DELETE_ACTION_ITEMS',
        'VIEW_SESSIONS', 'CREATE_SESSIONS', 'UPDATE_SESSIONS', 'DELETE_SESSIONS',
      ];
    case UserRole.TEAM_LEADER:
      return [
        'VIEW_SCORECARDS', 'CREATE_SCORECARDS', 'UPDATE_SCORECARDS',
        'VIEW_AGENTS',
        'VIEW_QUICK_NOTES', 'CREATE_QUICK_NOTES', 'UPDATE_QUICK_NOTES',
        'VIEW_ACTION_ITEMS', 'CREATE_ACTION_ITEMS', 'UPDATE_ACTION_ITEMS',
        'VIEW_SESSIONS', 'CREATE_SESSIONS', 'UPDATE_SESSIONS',
      ];
    case UserRole.AGENT:
      return [
        'VIEW_QUICK_NOTES',
        'VIEW_ACTION_ITEMS',
        'VIEW_SESSIONS',
      ];
    default:
      return [];
  }
}