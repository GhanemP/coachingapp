import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { hasPermission } from '@/lib/rbac';

export interface PermissionCheckOptions {
  permissions?: string[];
  requireAll?: boolean;
  roles?: UserRole[];
}

type APIHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Middleware to check if user has required permissions
 */
export async function checkPermissions(
  request: NextRequest,
  options: PermissionCheckOptions
): Promise<NextResponse | null> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;

    // Check role-based access first
    if (options.roles && !options.roles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check permission-based access
    if (options.permissions && options.permissions.length > 0) {
      const permissionChecks = await Promise.all(
        options.permissions.map(permission => hasPermission(userRole, permission))
      );

      const hasRequiredPermissions = options.requireAll
        ? permissionChecks.every(Boolean)
        : permissionChecks.some(Boolean);

      if (!hasRequiredPermissions) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    return null; // Permission granted
  } catch (error) {
    logger.error('Permission check error:', error as Error);
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withPermissions(handler: APIHandler, options: PermissionCheckOptions) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const permissionError = await checkPermissions(request, options);
    if (permissionError) {
      return permissionError;
    }

    return handler(request, context);
  };
}

/**
 * Permission decorators for common use cases
 */
export const requireAdmin = (handler: APIHandler) =>
  withPermissions(handler, { roles: [UserRole.ADMIN] });

export const requireManagerOrAbove = (handler: APIHandler) =>
  withPermissions(handler, { roles: [UserRole.ADMIN, UserRole.MANAGER] });

export const requireTeamLeaderOrAbove = (handler: APIHandler) =>
  withPermissions(handler, { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEADER] });

export const requirePermission = (permission: string) => (handler: APIHandler) =>
  withPermissions(handler, { permissions: [permission] });

export const requirePermissions =
  (permissions: string[], requireAll = false) =>
  (handler: APIHandler) =>
    withPermissions(handler, { permissions, requireAll });
