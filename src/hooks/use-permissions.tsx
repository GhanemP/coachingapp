import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  
  // Use refs to track fetch state and prevent duplicate requests
  const fetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');
  
  // Create stable session key
  const sessionKey = useMemo(() => {
    if (!session?.user) return '';
    return `${session.user.id}-${session.user.role}`;
  }, [session?.user]);

  useEffect(() => {
    // Skip if still loading auth status
    if (status === 'loading') {
      return;
    }
    
    // Skip if no session
    if (!session?.user?.role) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    
    // Skip if we've already fetched for this session
    if (lastFetchKeyRef.current === sessionKey) {
      return;
    }
    
    // Skip if already fetching
    if (fetchingRef.current) {
      return;
    }

    const fetchPermissions = async () => {
      fetchingRef.current = true;
      lastFetchKeyRef.current = sessionKey;
      
      try {
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
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        
        // Fallback to role-based permissions
        if (session?.user?.role) {
          setPermissions(getRoleBasedPermissions(session.user.role));
        } else {
          setPermissions([]);
        }
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchPermissions();
  }, [sessionKey, status, session?.user?.role]);

  const hasPermission = useCallback((permission: string): boolean => {
    // Admin has all permissions
    if (session?.user?.role === UserRole.ADMIN) {
      return true;
    }
    
    // Check if user has the specific permission
    return permissions.includes(permission.toUpperCase());
  }, [permissions, session?.user?.role]);

  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return session?.user?.role === role;
  }, [session?.user?.role]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.includes(session?.user?.role as UserRole);
  }, [session?.user?.role]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    permissions,
    loading,
    error,
  }), [
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    permissions,
    loading,
    error,
  ]);
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

  // Memoize the access check to prevent re-calculations
  const hasAccess = useMemo(() => {
    let access = true;

    // Check role-based access
    if (role && !hasRole(role)) {
      access = false;
    }

    if (roles && !hasAnyRole(roles)) {
      access = false;
    }

    // Check permission-based access
    if (permission && !hasPermission(permission)) {
      access = false;
    }

    if (permissions) {
      if (requireAll && !hasAllPermissions(permissions)) {
        access = false;
      } else if (!requireAll && !hasAnyPermission(permissions)) {
        access = false;
      }
    }

    return access;
  }, [
    role,
    roles,
    permission,
    permissions,
    requireAll,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
  ]);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
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
