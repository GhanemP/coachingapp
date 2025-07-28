import { UserRole } from '@/lib/constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string; // For agents
  department?: string; // For agents and managers
  teamName?: string; // For team leaders
  managerId?: string; // For team leaders
  teamLeaderId?: string; // For agents
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user?: AuthUser;
}

// Role-based permissions
export const RolePermissions = {
  ADMIN: {
    canManageUsers: true,
    canManageSystem: true,
    canViewAllData: true,
    canManageAllSessions: true,
  },
  MANAGER: {
    canManageTeamLeaders: true,
    canViewTeamLeaders: true,
    canViewAgents: true,
    canManageSessions: true,
    canViewReports: true,
  },
  TEAM_LEADER: {
    canManageAgents: true,
    canViewAgents: true,
    canManageSessions: true,
    canViewReports: true,
  },
  AGENT: {
    canViewOwnData: true,
    canViewOwnSessions: true,
  },
} as const;

export type PermissionKey = keyof (typeof RolePermissions)[keyof typeof RolePermissions];
