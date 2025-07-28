import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [key: string]: Permission[];
}

// Cache for performance - permissions don't change frequently
const permissionCache: Map<string, { value: boolean; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Prevent unlimited cache growth

// Cache cleanup timer management
let cleanupTimer: NodeJS.Timeout | null = null;

// Clear cache when permissions are updated
export function clearPermissionCache() {
  permissionCache.clear();
}

// Clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of permissionCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      permissionCache.delete(key);
    }
  }
}

// Start periodic cache cleanup with proper lifecycle management
function startCacheCleanup() {
  if (cleanupTimer) {
    return; // Already running
  }
  cleanupTimer = setInterval(cleanExpiredCache, CACHE_DURATION);
}

// Stop cache cleanup and prevent memory leaks
export function stopCacheCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Initialize cleanup only in server environment
if (typeof window === 'undefined') {
  startCacheCleanup();

  // Cleanup on process exit to prevent memory leaks
  // Check if listeners are already added to prevent memory leaks
  if (process.listenerCount('exit') === 0) {
    process.on('exit', stopCacheCleanup);
  }
  if (process.listenerCount('SIGINT') < 10) {
    process.on('SIGINT', stopCacheCleanup);
  }
  if (process.listenerCount('SIGTERM') < 10) {
    process.on('SIGTERM', stopCacheCleanup);
  }
}

// Get user permissions from database
export async function getUserPermissions(userRole: UserRole): Promise<string[]> {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: userRole,
      },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map(rp => rp.permission.name);
  } catch (error) {
    logger.error('Error fetching user permissions:', error as Error);
    return [];
  }
}

// Check if user has specific permission
export async function hasPermission(userRole: UserRole, permissionName: string): Promise<boolean> {
  const cacheKey = `${userRole}:${permissionName}`;
  const now = Date.now();

  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  try {
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: userRole,
        permission: {
          name: permissionName,
        },
      },
    });

    const hasAccess = !!rolePermission;

    // Update cache with size limit
    if (permissionCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(permissionCache.entries());
      entries.sort((a, b) => a[1]?.timestamp - b[1]?.timestamp);
      for (let i = 0; i < Math.floor(MAX_CACHE_SIZE * 0.1); i++) {
        permissionCache.delete(entries[i][0]);
      }
    }

    permissionCache.set(cacheKey, { value: hasAccess, timestamp: now });

    return hasAccess;
  } catch (error) {
    logger.error('Error checking permission:', error as Error);
    return false;
  }
}

// Check if user has permission for resource and action
export async function hasResourcePermission(
  userRole: UserRole,
  resource: string,
  action: string
): Promise<boolean> {
  const cacheKey = `${userRole}:${resource}:${action}`;
  const now = Date.now();

  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  try {
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: userRole,
        permission: {
          resource: resource,
          action: action,
        },
      },
    });

    const hasAccess = !!rolePermission;

    // Update cache with size limit
    if (permissionCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(permissionCache.entries());
      entries.sort((a, b) => a[1]?.timestamp - b[1]?.timestamp);
      for (let i = 0; i < Math.floor(MAX_CACHE_SIZE * 0.1); i++) {
        permissionCache.delete(entries[i][0]);
      }
    }

    permissionCache.set(cacheKey, { value: hasAccess, timestamp: now });

    return hasAccess;
  } catch (error) {
    logger.error('Error checking resource permission:', error as Error);
    return false;
  }
}

// Get all permissions for a role
export function getAllowedPermissions(userRole: UserRole): Promise<string[]> {
  return getUserPermissions(userRole);
}

// Get all resources a user can access
export async function getAllowedResources(userRole: UserRole): Promise<string[]> {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: userRole,
      },
      include: {
        permission: true,
      },
    });

    const resources = new Set(rolePermissions.map(rp => rp.permission.resource));
    return Array.from(resources);
  } catch (error) {
    logger.error('Error fetching allowed resources:', error as Error);
    return [];
  }
}

// Get all actions a user can perform on a resource
export async function getAllowedActions(userRole: UserRole, resource: string): Promise<string[]> {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: userRole,
        permission: {
          resource: resource,
        },
      },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map(rp => rp.permission.action);
  } catch (error) {
    logger.error('Error fetching allowed actions:', error as Error);
    return [];
  }
}

// Legacy compatibility - synchronous version using hardcoded permissions
export function hasPermissionSync(userRole: UserRole, resource: string): boolean {
  // Fallback to basic role checking for backward compatibility
  const roleHierarchy = {
    [UserRole.ADMIN]: 4,
    [UserRole.MANAGER]: 3,
    [UserRole.TEAM_LEADER]: 2,
    [UserRole.AGENT]: 1,
  };

  const roleLevel = roleHierarchy[userRole] || 0;

  // Basic resource access rules
  switch (resource) {
    case 'users':
    case 'roles':
    case 'system':
    case 'database':
      return roleLevel >= 4; // Admin only
    case 'reports':
    case 'team_leaders':
    case 'team_data':
      return roleLevel >= 3; // Manager and above
    case 'agents':
    case 'sessions':
    case 'metrics':
      return roleLevel >= 2; // Team Leader and above
    case 'own_metrics':
    case 'own_sessions':
    case 'profile':
      return roleLevel >= 1; // All roles
    default:
      return false;
  }
}
