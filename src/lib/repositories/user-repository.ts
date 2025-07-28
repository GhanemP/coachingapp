import { User } from '@prisma/client';

import { prisma } from '../prisma';

export interface UserCreateInput {
  email: string;
  name?: string;
  role?: string;
  hashedPassword?: string;
  managedBy?: string;
  teamLeaderId?: string;
}

export interface UserUpdateInput {
  name?: string;
  role?: string;
  hashedPassword?: string;
  managedBy?: string;
  teamLeaderId?: string;
  isActive?: boolean;
}

export interface UserFilters {
  role?: string;
  managedBy?: string;
  teamLeaderId?: string;
  isActive?: boolean;
}

export class UserRepository {
  private handleError(operation: string, error: unknown): void {
    console.error(`UserRepository error in ${operation}:`, error);
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id }
      });
    } catch (error) {
      this.handleError('findById', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email }
      });
    } catch (error) {
      this.handleError('findByEmail', error);
      throw error;
    }
  }

  async findByRole(role: string): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: { role }
      });
    } catch (error) {
      this.handleError('findByRole', error);
      throw error;
    }
  }

  async findByManager(managerId: string): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: { managedBy: managerId }
      });
    } catch (error) {
      this.handleError('findByManager', error);
      throw error;
    }
  }

  async findByTeamLeader(teamLeaderId: string): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: { teamLeaderId }
      });
    } catch (error) {
      this.handleError('findByTeamLeader', error);
      throw error;
    }
  }

  async findMany(filters?: UserFilters): Promise<User[]> {
    try {
      const where: Record<string, unknown> = {};
      
      if (filters?.role) {
        where.role = filters.role;
      }
      if (filters?.managedBy) {
        where.managedBy = filters.managedBy;
      }
      if (filters?.teamLeaderId) {
        where.teamLeaderId = filters.teamLeaderId;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      return await prisma.user.findMany({ where });
    } catch (error) {
      this.handleError('findMany', error);
      throw error;
    }
  }

  async create(data: UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  async update(id: string, data: UserUpdateInput): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  async delete(id: string): Promise<User> {
    try {
      return await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    }
  }

  async count(filters?: UserFilters): Promise<number> {
    try {
      const where: Record<string, unknown> = {};
      
      if (filters?.role) {
        where.role = filters.role;
      }
      if (filters?.managedBy) {
        where.managedBy = filters.managedBy;
      }
      if (filters?.teamLeaderId) {
        where.teamLeaderId = filters.teamLeaderId;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      return await prisma.user.count({ where });
    } catch (error) {
      this.handleError('count', error);
      throw error;
    }
  }

  async countByRole(role: string): Promise<number> {
    try {
      return await prisma.user.count({
        where: { role }
      });
    } catch (error) {
      this.handleError('countByRole', error);
      throw error;
    }
  }

  async deactivate(id: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('deactivate', error);
      throw error;
    }
  }

  async reactivate(id: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      this.handleError('reactivate', error);
      throw error;
    }
  }

  async findWithRelations(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          manager: true,
          managedUsers: true,
          teamLeader: true,
          agents: true,
          agentProfile: true,
          teamLeaderProfile: true,
          managerProfile: true
        }
      });
    } catch (error) {
      this.handleError('findWithRelations', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userRepository = new UserRepository();