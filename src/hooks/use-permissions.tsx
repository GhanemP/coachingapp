import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { UserRole } from '@/lib/constants';

interface UsePermissionsReturn {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  permissions: string[];
  loading: boolean;
  error: string | null;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (status === 'loading') return;
      
      if (!session?.user?.role) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/users/permissions`);
        
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions || []);
          setError(null);
        } else {
          throw new Error('Failed to fetch permissions');
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [session, status]);

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions]);

  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return session?.user?.role === role;
  }, [session?.user?.role]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.includes(session?.user?.role as UserRole);
  }, [session?.user?.role]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    permissions,
    loading,
    error,
  };
}

// Higher-order component for permission-based rendering
interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: UserRole;
  roles?: UserRole[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback = null,
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    loading,
  } = usePermissions();

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  let hasAccess = true;

  // Check role-based access
  if (role && !hasRole(role)) {
    hasAccess = false;
  }

  if (roles && !hasAnyRole(roles)) {
    hasAccess = false;
  }

  // Check permission-based access
  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (permissions) {
    if (requireAll && !hasAllPermissions(permissions)) {
      hasAccess = false;
    } else if (!requireAll && !hasAnyPermission(permissions)) {
      hasAccess = false;
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components
export const AdminOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <PermissionGuard role={UserRole.ADMIN} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const ManagerOrAbove = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <PermissionGuard roles={[UserRole.ADMIN, UserRole.MANAGER]} fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const TeamLeaderOrAbove = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <PermissionGuard roles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEADER]} fallback={fallback}>
    {children}
  </PermissionGuard>
);
