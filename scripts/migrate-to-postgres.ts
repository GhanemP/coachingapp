#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

// Create separate Prisma clients for SQLite and PostgreSQL
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SQLITE_DATABASE_URL || 'file:./prisma/dev.db'
    }
  }
});

const postgresClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

interface MigrationStats {
  users: number;
  agents: number;
  teamLeaders: number;
  managers: number;
  permissions: number;
  rolePermissions: number;
  performances: number;
  agentMetrics: number;
  coachingSessions: number;
  sessionMetrics: number;
  quickNotes: number;
  actionItems: number;
  actionPlans: number;
  actionPlanItems: number;
  notifications: number;
  auditLogs: number;
}

async function migrateData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    users: 0,
    agents: 0,
    teamLeaders: 0,
    managers: 0,
    permissions: 0,
    rolePermissions: 0,
    performances: 0,
    agentMetrics: 0,
    coachingSessions: 0,
    sessionMetrics: 0,
    quickNotes: 0,
    actionItems: 0,
    actionPlans: 0,
    actionPlanItems: 0,
    notifications: 0,
    auditLogs: 0,
  };

  try {
    console.log('🚀 Starting migration from SQLite to PostgreSQL...\n');

    // 1. Migrate Users (no dependencies)
    console.log('📋 Migrating users...');
    const users = await sqliteClient.user.findMany();
    for (const user of users) {
      await postgresClient.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          hashedPassword: user.hashedPassword,
          role: user.role,
          managedBy: user.managedBy,
          teamLeaderId: user.teamLeaderId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      });
      stats.users++;
    }
    console.log(`✅ Migrated ${stats.users} users\n`);

    // 2. Migrate Agents (depends on users)
    console.log('📋 Migrating agents...');
    const agents = await sqliteClient.agent.findMany();
    for (const agent of agents) {
      await postgresClient.agent.create({
        data: {
          id: agent.id,
          userId: agent.userId,
          employeeId: agent.employeeId,
          department: agent.department,
          hireDate: agent.hireDate,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        }
      });
      stats.agents++;
    }
    console.log(`✅ Migrated ${stats.agents} agents\n`);

    // 3. Migrate TeamLeaders (depends on users)
    console.log('📋 Migrating team leaders...');
    const teamLeaders = await sqliteClient.teamLeader.findMany();
    for (const leader of teamLeaders) {
      await postgresClient.teamLeader.create({
        data: {
          id: leader.id,
          userId: leader.userId,
          department: leader.department,
          createdAt: leader.createdAt,
          updatedAt: leader.updatedAt,
        }
      });
      stats.teamLeaders++;
    }
    console.log(`✅ Migrated ${stats.teamLeaders} team leaders\n`);

    // 4. Migrate Managers (depends on users)
    console.log('📋 Migrating managers...');
    const managers = await sqliteClient.manager.findMany();
    for (const manager of managers) {
      await postgresClient.manager.create({
        data: {
          id: manager.id,
          userId: manager.userId,
          createdAt: manager.createdAt,
          updatedAt: manager.updatedAt,
        }
      });
      stats.managers++;
    }
    console.log(`✅ Migrated ${stats.managers} managers\n`);

    // 5. Migrate Permissions
    console.log('📋 Migrating permissions...');
    const permissions = await sqliteClient.permission.findMany();
    for (const permission of permissions) {
      await postgresClient.permission.create({
        data: {
          id: permission.id,
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        }
      });
      stats.permissions++;
    }
    console.log(`✅ Migrated ${stats.permissions} permissions\n`);

    // 6. Migrate RolePermissions
    console.log('📋 Migrating role permissions...');
    const rolePermissions = await sqliteClient.rolePermission.findMany();
    for (const rolePerm of rolePermissions) {
      await postgresClient.rolePermission.create({
        data: {
          id: rolePerm.id,
          role: rolePerm.role,
          permissionId: rolePerm.permissionId,
          createdAt: rolePerm.createdAt,
        }
      });
      stats.rolePermissions++;
    }
    console.log(`✅ Migrated ${stats.rolePermissions} role permissions\n`);

    // 7. Migrate Performances (depends on agents)
    console.log('📋 Migrating performance records...');
    const performances = await sqliteClient.performance.findMany();
    for (const perf of performances) {
      await postgresClient.performance.create({
        data: {
          id: perf.id,
          agentId: perf.agentId,
          period: perf.period,
          metricType: perf.metricType,
          score: perf.score,
          target: perf.target,
          createdAt: perf.createdAt,
          updatedAt: perf.updatedAt,
        }
      });
      stats.performances++;
    }
    console.log(`✅ Migrated ${stats.performances} performance records\n`);

    // 8. Migrate AgentMetrics (depends on users)
    console.log('📋 Migrating agent metrics...');
    const agentMetrics = await sqliteClient.agentMetric.findMany();
    for (const metric of agentMetrics) {
      await postgresClient.agentMetric.create({
        data: {
          id: metric.id,
          agentId: metric.agentId,
          month: metric.month,
          year: metric.year,
          service: metric.service,
          productivity: metric.productivity,
          quality: metric.quality,
          assiduity: metric.assiduity,
          performance: metric.performance,
          adherence: metric.adherence,
          lateness: metric.lateness,
          breakExceeds: metric.breakExceeds,
          serviceWeight: metric.serviceWeight,
          productivityWeight: metric.productivityWeight,
          qualityWeight: metric.qualityWeight,
          assiduityWeight: metric.assiduityWeight,
          performanceWeight: metric.performanceWeight,
          adherenceWeight: metric.adherenceWeight,
          latenessWeight: metric.latenessWeight,
          breakExceedsWeight: metric.breakExceedsWeight,
          totalScore: metric.totalScore,
          percentage: metric.percentage,
          notes: metric.notes,
          createdAt: metric.createdAt,
          updatedAt: metric.updatedAt,
        }
      });
      stats.agentMetrics++;
    }
    console.log(`✅ Migrated ${stats.agentMetrics} agent metrics\n`);

    // 9. Migrate CoachingSessions (depends on users)
    console.log('📋 Migrating coaching sessions...');
    const sessions = await sqliteClient.coachingSession.findMany();
    for (const session of sessions) {
      await postgresClient.coachingSession.create({
        data: {
          id: session.id,
          agentId: session.agentId,
          teamLeaderId: session.teamLeaderId,
          scheduledDate: session.scheduledDate,
          sessionDate: session.sessionDate,
          status: session.status,
          duration: session.duration,
          previousScore: session.previousScore,
          currentScore: session.currentScore,
          preparationNotes: session.preparationNotes,
          sessionNotes: session.sessionNotes,
          actionItems: session.actionItems,
          followUpDate: session.followUpDate,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }
      });
      stats.coachingSessions++;
    }
    console.log(`✅ Migrated ${stats.coachingSessions} coaching sessions\n`);

    // 10. Migrate SessionMetrics (depends on sessions)
    console.log('📋 Migrating session metrics...');
    const sessionMetrics = await sqliteClient.sessionMetric.findMany();
    for (const metric of sessionMetrics) {
      await postgresClient.sessionMetric.create({
        data: {
          id: metric.id,
          sessionId: metric.sessionId,
          metricName: metric.metricName,
          score: metric.score,
          comments: metric.comments,
          createdAt: metric.createdAt,
          updatedAt: metric.updatedAt,
        }
      });
      stats.sessionMetrics++;
    }
    console.log(`✅ Migrated ${stats.sessionMetrics} session metrics\n`);

    // 11. Migrate QuickNotes (depends on users)
    console.log('📋 Migrating quick notes...');
    const quickNotes = await sqliteClient.quickNote.findMany();
    for (const note of quickNotes) {
      await postgresClient.quickNote.create({
        data: {
          id: note.id,
          content: note.content,
          category: note.category,
          agentId: note.agentId,
          authorId: note.authorId,
          isPrivate: note.isPrivate,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        }
      });
      stats.quickNotes++;
    }
    console.log(`✅ Migrated ${stats.quickNotes} quick notes\n`);

    // 12. Migrate ActionItems (depends on users and sessions)
    console.log('📋 Migrating action items...');
    const actionItems = await sqliteClient.actionItem.findMany();
    for (const item of actionItems) {
      await postgresClient.actionItem.create({
        data: {
          id: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          status: item.status,
          dueDate: item.dueDate,
          completedDate: item.completedDate,
          agentId: item.agentId,
          sessionId: item.sessionId,
          createdBy: item.createdBy,
          assignedTo: item.assignedTo,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      });
      stats.actionItems++;
    }
    console.log(`✅ Migrated ${stats.actionItems} action items\n`);

    // 13. Migrate ActionPlans (depends on users)
    console.log('📋 Migrating action plans...');
    const actionPlans = await sqliteClient.actionPlan.findMany();
    for (const plan of actionPlans) {
      await postgresClient.actionPlan.create({
        data: {
          id: plan.id,
          title: plan.title,
          description: plan.description,
          status: plan.status,
          startDate: plan.startDate,
          endDate: plan.endDate,
          agentId: plan.agentId,
          createdBy: plan.createdBy,
          approvedBy: plan.approvedBy,
          approvedAt: plan.approvedAt,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        }
      });
      stats.actionPlans++;
    }
    console.log(`✅ Migrated ${stats.actionPlans} action plans\n`);

    // 14. Migrate ActionPlanItems (depends on actionPlans)
    console.log('📋 Migrating action plan items...');
    const actionPlanItems = await sqliteClient.actionPlanItem.findMany();
    for (const item of actionPlanItems) {
      await postgresClient.actionPlanItem.create({
        data: {
          id: item.id,
          actionPlanId: item.actionPlanId,
          title: item.title,
          description: item.description,
          targetMetric: item.targetMetric,
          targetValue: item.targetValue,
          currentValue: item.currentValue,
          status: item.status,
          dueDate: item.dueDate,
          completedDate: item.completedDate,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      });
      stats.actionPlanItems++;
    }
    console.log(`✅ Migrated ${stats.actionPlanItems} action plan items\n`);

    // 15. Migrate Notifications (depends on users)
    console.log('📋 Migrating notifications...');
    const notifications = await sqliteClient.notification.findMany();
    for (const notif of notifications) {
      await postgresClient.notification.create({
        data: {
          id: notif.id,
          userId: notif.userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          data: notif.data || undefined,
          isRead: notif.isRead,
          readAt: notif.readAt,
          createdAt: notif.createdAt
        }
      });
      stats.notifications++;
    }
    console.log(`✅ Migrated ${stats.notifications} notifications\n`);

    // 16. Migrate AuditLogs (depends on users)
    console.log('📋 Migrating audit logs...');
    const auditLogs = await sqliteClient.auditLog.findMany();
    for (const log of auditLogs) {
      await postgresClient.auditLog.create({
        data: {
          id: log.id,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details || undefined,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
        }
      });
      stats.auditLogs++;
    }
    console.log(`✅ Migrated ${stats.auditLogs} audit logs\n`);

    return stats;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function verifyMigration(stats: MigrationStats): Promise<boolean> {
  console.log('🔍 Verifying migration...\n');
  
  const counts = {
    users: await postgresClient.user.count(),
    agents: await postgresClient.agent.count(),
    teamLeaders: await postgresClient.teamLeader.count(),
    managers: await postgresClient.manager.count(),
    permissions: await postgresClient.permission.count(),
    rolePermissions: await postgresClient.rolePermission.count(),
    performances: await postgresClient.performance.count(),
    agentMetrics: await postgresClient.agentMetric.count(),
    coachingSessions: await postgresClient.coachingSession.count(),
    sessionMetrics: await postgresClient.sessionMetric.count(),
    quickNotes: await postgresClient.quickNote.count(),
    actionItems: await postgresClient.actionItem.count(),
    actionPlans: await postgresClient.actionPlan.count(),
    actionPlanItems: await postgresClient.actionPlanItem.count(),
    notifications: await postgresClient.notification.count(),
    auditLogs: await postgresClient.auditLog.count(),
  };

  let success = true;
  for (const [table, expectedCount] of Object.entries(stats)) {
    const actualCount = counts[table as keyof typeof counts];
    if (actualCount !== expectedCount) {
      console.error(`❌ ${table}: Expected ${expectedCount}, got ${actualCount}`);
      success = false;
    } else {
      console.log(`✅ ${table}: ${actualCount} records`);
    }
  }

  return success;
}

async function main() {
  try {
    // Check if PostgreSQL is configured
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('postgresql')) {
      console.error('❌ PostgreSQL DATABASE_URL not configured in .env file');
      console.error('Please set DATABASE_URL to a valid PostgreSQL connection string');
      process.exit(1);
    }

    // Test PostgreSQL connection
    console.log('🔌 Testing PostgreSQL connection...');
    await postgresClient.$connect();
    console.log('✅ PostgreSQL connection successful\n');

    // Perform migration
    const stats = await migrateData();

    // Verify migration
    const verified = await verifyMigration(stats);

    if (verified) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update your .env file to use the PostgreSQL DATABASE_URL');
      console.log('2. Run: npx prisma generate');
      console.log('3. Test the application with PostgreSQL');
    } else {
      console.error('\n❌ Migration verification failed!');
      console.error('Some records may not have been migrated correctly.');
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Run the migration
main();