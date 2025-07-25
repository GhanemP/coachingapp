import { UserRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [key: string]: Permission[];
}

// Cache for performance - permissions don't change frequently
const permissionCache: Map<string, boolean> = new Map();
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear cache when permissions are updated
export function clearPermissionCache() {
  permissionCache.clear();
  cacheExpiry = 0;
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
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

// Check if user has specific permission
export async function hasPermission(
  userRole: UserRole,
  permissionName: string
): Promise<boolean> {
  const cacheKey = `${userRole}:${permissionName}`;
  const now = Date.now();
  
  // Check cache first
  if (cacheExpiry > now && permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey) || false;
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
    
    // Update cache
    permissionCache.set(cacheKey, hasAccess);
    if (cacheExpiry <= now) {
      cacheExpiry = now + CACHE_DURATION;
    }
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking permission:', error);
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
  if (cacheExpiry > now && permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey) || false;
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
    
    // Update cache
    permissionCache.set(cacheKey, hasAccess);
    if (cacheExpiry <= now) {
      cacheExpiry = now + CACHE_DURATION;
    }
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking resource permission:', error);
    return false;
  }
}

// Get all permissions for a role
export async function getAllowedPermissions(userRole: UserRole): Promise<string[]> {
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
    console.error('Error fetching allowed resources:', error);
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
    console.error('Error fetching allowed actions:', error);
    return [];
  }
}

// Legacy compatibility - synchronous version using hardcoded permissions
export function hasPermissionSync(
  userRole: UserRole,
  resource: string
): boolean {
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