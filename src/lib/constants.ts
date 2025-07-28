/**
 * User roles and session status constants
 * These match the string values used in the database
 */

export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  TEAM_LEADER: 'TEAM_LEADER',
  AGENT: 'AGENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const SessionStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

// Role hierarchy for permissions
export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.TEAM_LEADER]: 2,
  [UserRole.AGENT]: 1,
} as const;

export function hasRole(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole as UserRole] >= ROLE_HIERARCHY[requiredRole as UserRole];
}

export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function isValidSessionStatus(status: string): status is SessionStatus {
  return Object.values(SessionStatus).includes(status as SessionStatus);
}
