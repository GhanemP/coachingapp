import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/constants";
import bcrypt from "bcryptjs";

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  department?: string;
  managedBy?: string;
  teamLeaderId?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  managedBy?: string;
  teamLeaderId?: string;
  department?: string;
  employeeId?: string;
}

export class UserManagementService {
  async createUser(data: CreateUserData) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: data.role,
        managedBy: data.managedBy,
        teamLeaderId: data.teamLeaderId,
      },
    });
  }

  async getUsersByRole(role: UserRole) {
    return await prisma.user.findMany({
      where: { role },
    });
  }

  async getUsersByManager(managerId: string) {
    return await prisma.user.findMany({
      where: { managedBy: managerId },
    });
  }

  async getUsersByTeamLeader(teamLeaderId: string) {
    return await prisma.user.findMany({
      where: { teamLeaderId: teamLeaderId },
    });
  }

  async updateUser(id: string, data: UpdateUserData) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string) {
    return await prisma.user.delete({
      where: { id },
    });
  }

  async getUserHierarchy(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const hierarchy = {
      user,
      manager: null as typeof user | null,
      teamLeaders: [] as typeof user[],
      agents: [] as typeof user[],
    };

    if (user.role === UserRole.MANAGER) {
      hierarchy.teamLeaders = await this.getUsersByManager(user.id);
    } else if (user.role === UserRole.TEAM_LEADER) {
      hierarchy.agents = await this.getUsersByTeamLeader(user.id);
      if (user.managedBy) {
        hierarchy.manager = await prisma.user.findUnique({
          where: { id: user.managedBy },
        });
      }
    } else if (user.role === UserRole.AGENT) {
      if (user.teamLeaderId) {
        hierarchy.manager = await prisma.user.findUnique({
          where: { id: user.teamLeaderId },
        });
      }
    }

    return hierarchy;
  }

  async assignTeamLeaderToManager(teamLeaderId: string, managerId: string) {
    return await prisma.user.update({
      where: { id: teamLeaderId },
      data: { managedBy: managerId },
    });
  }

  async assignAgentToTeamLeader(agentId: string, teamLeaderId: string) {
    return await prisma.user.update({
      where: { id: agentId },
      data: { teamLeaderId: teamLeaderId },
    });
  }

  async getAvailableTeamLeaders(managerId: string) {
    return await prisma.user.findMany({
      where: {
        role: UserRole.TEAM_LEADER,
        managedBy: managerId,
      },
    });
  }

  async getAvailableAgents() {
    return await prisma.user.findMany({
      where: {
        role: UserRole.AGENT,
        teamLeaderId: null,
      },
    });
  }
}