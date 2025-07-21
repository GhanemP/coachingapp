import { UserRole } from "@/lib/constants";

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [key: string]: Permission[];
}

export const rolePermissions: RolePermissions = {
  [UserRole.ADMIN]: [
    { resource: "users", actions: ["create", "read", "update", "delete"] },
    { resource: "managers", actions: ["create", "read", "update", "delete"] },
    { resource: "teamLeaders", actions: ["create", "read", "update", "delete"] },
    { resource: "agents", actions: ["create", "read", "update", "delete"] },
    { resource: "sessions", actions: ["create", "read", "update", "delete"] },
    { resource: "performance", actions: ["read", "update"] },
    { resource: "reports", actions: ["read", "create"] },
  ],
  [UserRole.MANAGER]: [
    { resource: "teamLeaders", actions: ["create", "read", "update", "delete"] },
    { resource: "agents", actions: ["read"] },
    { resource: "sessions", actions: ["read", "create", "update"] },
    { resource: "performance", actions: ["read", "update"] },
    { resource: "reports", actions: ["read", "create"] },
  ],
  [UserRole.TEAM_LEADER]: [
    { resource: "agents", actions: ["read", "update"] },
    { resource: "sessions", actions: ["create", "read", "update"] },
    { resource: "performance", actions: ["read", "update"] },
    { resource: "reports", actions: ["read"] },
  ],
  [UserRole.AGENT]: [
    { resource: "sessions", actions: ["read"] },
    { resource: "performance", actions: ["read"] },
  ],
};

export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = rolePermissions[userRole];
  if (!permissions) return false;

  return permissions.some(
    (permission) =>
      permission.resource === resource && permission.actions.includes(action)
  );
}

export function getAllowedResources(userRole: UserRole): string[] {
  const permissions = rolePermissions[userRole];
  if (!permissions) return [];

  return permissions.map((p) => p.resource);
}

export function getAllowedActions(userRole: UserRole, resource: string): string[] {
  const permissions = rolePermissions[userRole];
  if (!permissions) return [];

  const permission = permissions.find((p) => p.resource === resource);
  return permission ? permission.actions : [];
}