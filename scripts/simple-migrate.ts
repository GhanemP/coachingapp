#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  console.log('🚀 PostgreSQL Migration Status Check\n');

  // Create PostgreSQL client
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    // Test PostgreSQL connection
    console.log('🔌 Testing PostgreSQL connection...');
    await prisma.$connect();
    console.log('✅ PostgreSQL connection successful\n');

    // Check current data in PostgreSQL
    console.log('📊 Current PostgreSQL Database Status:');
    console.log('=====================================');
    
    const counts = {
      users: await prisma.user.count(),
      agents: await prisma.agent.count(),
      teamLeaders: await prisma.teamLeader.count(),
      managers: await prisma.manager.count(),
      permissions: await prisma.permission.count(),
      rolePermissions: await prisma.rolePermission.count(),
      performances: await prisma.performance.count(),
      agentMetrics: await prisma.agentMetric.count(),
      coachingSessions: await prisma.coachingSession.count(),
      sessionMetrics: await prisma.sessionMetric.count(),
      quickNotes: await prisma.quickNote.count(),
      actionItems: await prisma.actionItem.count(),
      actionPlans: await prisma.actionPlan.count(),
      actionPlanItems: await prisma.actionPlanItem.count(),
      notifications: await prisma.notification.count(),
      auditLogs: await prisma.auditLog.count(),
    };

    let hasData = false;
    for (const [table, count] of Object.entries(counts)) {
      if (count > 0) {
        hasData = true;
        console.log(`✅ ${table}: ${count} records`);
      } else {
        console.log(`⚪ ${table}: 0 records`);
      }
    }

    console.log('\n=====================================');
    
    if (hasData) {
      console.log('\n⚠️  PostgreSQL database already contains data!');
      console.log('If you need to migrate from SQLite, you may need to:');
      console.log('1. Clear the PostgreSQL database first');
      console.log('2. Use a different migration approach');
    } else {
      console.log('\n📝 PostgreSQL database is empty and ready for data.');
      console.log('\nNext steps:');
      console.log('1. If you have data in SQLite, we need a different migration approach');
      console.log('2. Or you can seed the database with: npm run db:seed');
    }

    // Check if we can connect to SQLite
    console.log('\n🔍 Checking SQLite database...');
    const sqliteUrl = process.env.SQLITE_DATABASE_URL;
    if (sqliteUrl) {
      console.log('✅ SQLite URL found in environment');
      console.log('\n💡 Note: The current Prisma schema is configured for PostgreSQL.');
      console.log('To migrate from SQLite, we would need to:');
      console.log('1. Create a separate Prisma schema for SQLite');
      console.log('2. Use raw SQL queries');
      console.log('3. Or use a database migration tool');
    } else {
      console.log('⚪ No SQLite URL found in environment');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});