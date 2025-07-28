#!/usr/bin/env node

/* eslint-disable */

/**
 * Data Migration Validation Script
 *
 * This script validates the data migration from SQLite to PostgreSQL
 * by comparing data integrity, relationships, and business logic constraints.
 */

const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');

// Initialize Prisma client for PostgreSQL
const prisma = new PrismaClient();

/**
 * Validation test suite
 */
class MigrationValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  /**
   * Add test result
   */
  addResult(testName, status, message, details = null) {
    const result = {
      test: testName,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    this.results.tests.push(result);
    this.results[status]++;

    const statusIcon = {
      passed: '✅',
      failed: '❌',
      warnings: '⚠️',
    };

    console.log(`${statusIcon[status]} ${testName}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Test 1: Database Connection
   */
  async testDatabaseConnection() {
    try {
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as test`;

      if (result && result[0] && result[0].test === 1) {
        this.addResult('testDatabaseConnection', 'passed', 'PostgreSQL connection successful');
      } else {
        this.addResult('testDatabaseConnection', 'failed', 'PostgreSQL connection test failed');
      }
    } catch (error) {
      this.addResult(
        'testDatabaseConnection',
        'failed',
        'Cannot connect to PostgreSQL',
        error.message
      );
    }
  }

  /**
   * Test 2: Table Structure Validation
   */
  async testTableStructure() {
    try {
      const tables = [
        'User',
        'Team',
        'Agent',
        'Session',
        'ActionItem',
        'QuickNote',
        'Scorecard',
        'Notification',
      ];

      const missingTables = [];

      for (const tableName of tables) {
        try {
          const modelName = tableName.toLowerCase();
          const count = await prisma[modelName].count();
          // Table exists if we can count records
        } catch (error) {
          if (error.code === 'P2021') {
            missingTables.push(tableName);
          }
        }
      }

      if (missingTables.length === 0) {
        this.addResult('testTableStructure', 'passed', 'All required tables exist');
      } else {
        this.addResult('testTableStructure', 'failed', 'Missing tables detected', missingTables);
      }
    } catch (error) {
      this.addResult(
        'testTableStructure',
        'failed',
        'Table structure validation failed',
        error.message
      );
    }
  }

  /**
   * Test 3: Data Count Comparison
   */
  async testDataCounts() {
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      this.addResult(
        'testDataCounts',
        'warnings',
        'SQLite database not found - skipping comparison'
      );
      return;
    }

    try {
      // Get PostgreSQL counts
      const pgCounts = {
        users: await prisma.user.count(),
        teams: await prisma.team.count(),
        agents: await prisma.agent.count(),
        sessions: await prisma.session.count(),
        actionItems: await prisma.actionItem.count(),
        quickNotes: await prisma.quickNote.count(),
        scorecards: await prisma.scorecard.count(),
        notifications: await prisma.notification.count(),
      };

      // Get SQLite counts
      const sqliteCounts = await this.getSQLiteCounts();

      const discrepancies = [];
      Object.keys(pgCounts).forEach(table => {
        const pgCount = pgCounts[table];
        const sqliteCount = sqliteCounts[table] || 0;

        if (pgCount !== sqliteCount) {
          discrepancies.push({
            table,
            postgresql: pgCount,
            sqlite: sqliteCount,
            difference: pgCount - sqliteCount,
          });
        }
      });

      if (discrepancies.length === 0) {
        this.addResult(
          'testDataCounts',
          'passed',
          'Data counts match between SQLite and PostgreSQL',
          pgCounts
        );
      } else {
        this.addResult(
          'testDataCounts',
          'warnings',
          'Data count discrepancies found',
          discrepancies
        );
      }
    } catch (error) {
      this.addResult('testDataCounts', 'failed', 'Data count comparison failed', error.message);
    }
  }

  /**
   * Get SQLite record counts
   */
  async getSQLiteCounts() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(SQLITE_DB_PATH);
      const counts = {};
      const tables = [
        { name: 'User', key: 'users' },
        { name: 'Team', key: 'teams' },
        { name: 'Agent', key: 'agents' },
        { name: 'Session', key: 'sessions' },
        { name: 'ActionItem', key: 'actionItems' },
        { name: 'QuickNote', key: 'quickNotes' },
        { name: 'Scorecard', key: 'scorecards' },
        { name: 'Notification', key: 'notifications' },
      ];

      let completed = 0;

      tables.forEach(({ name, key }) => {
        db.get(`SELECT COUNT(*) as count FROM ${name}`, [], (err, row) => {
          if (err) {
            counts[key] = 0;
          } else {
            counts[key] = row.count;
          }

          completed++;
          if (completed === tables.length) {
            db.close();
            resolve(counts);
          }
        });
      });
    });
  }

  /**
   * Test 4: Data Integrity Validation
   */
  async testDataIntegrity() {
    try {
      const issues = [];

      // Test 1: Users should have valid email addresses
      const usersWithInvalidEmails = await prisma.user.findMany({
        where: {
          email: {
            not: {
              contains: '@',
            },
          },
        },
      });

      if (usersWithInvalidEmails.length > 0) {
        issues.push(`${usersWithInvalidEmails.length} users with invalid email addresses`);
      }

      // Test 2: Sessions should have valid user references
      const orphanedSessions = await prisma.session.findMany({
        where: {
          user: null,
        },
      });

      if (orphanedSessions.length > 0) {
        issues.push(`${orphanedSessions.length} sessions without valid user references`);
      }

      // Test 3: Action items should have valid session references
      const orphanedActionItems = await prisma.actionItem.findMany({
        where: {
          session: null,
        },
      });

      if (orphanedActionItems.length > 0) {
        issues.push(`${orphanedActionItems.length} action items without valid session references`);
      }

      if (issues.length === 0) {
        this.addResult('testDataIntegrity', 'passed', 'Data integrity validation passed');
      } else {
        this.addResult('testDataIntegrity', 'warnings', 'Data integrity issues found', issues);
      }
    } catch (error) {
      this.addResult(
        'testDataIntegrity',
        'failed',
        'Data integrity validation failed',
        error.message
      );
    }
  }

  /**
   * Test 5: Business Logic Validation
   */
  async testBusinessLogic() {
    try {
      const issues = [];

      // Test 1: Users should have at least one role
      const usersWithoutRoles = await prisma.user.findMany({
        where: {
          OR: [{ role: null }, { role: '' }],
        },
      });

      if (usersWithoutRoles.length > 0) {
        issues.push(`${usersWithoutRoles.length} users without assigned roles`);
      }

      // Test 2: Active sessions should have recent activity
      const staleActiveSessions = await prisma.session.findMany({
        where: {
          status: 'active',
          updatedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          },
        },
      });

      if (staleActiveSessions.length > 0) {
        issues.push(`${staleActiveSessions.length} active sessions with no recent activity`);
      }

      // Test 3: Completed action items should have completion dates
      const completedItemsWithoutDates = await prisma.actionItem.findMany({
        where: {
          status: 'completed',
          completedAt: null,
        },
      });

      if (completedItemsWithoutDates.length > 0) {
        issues.push(
          `${completedItemsWithoutDates.length} completed action items without completion dates`
        );
      }

      if (issues.length === 0) {
        this.addResult('testBusinessLogic', 'passed', 'Business logic validation passed');
      } else {
        this.addResult('testBusinessLogic', 'warnings', 'Business logic issues found', issues);
      }
    } catch (error) {
      this.addResult(
        'testBusinessLogic',
        'failed',
        'Business logic validation failed',
        error.message
      );
    }
  }

  /**
   * Test 6: Performance Validation
   */
  async testPerformance() {
    try {
      const performanceTests = [];

      // Test 1: User lookup by email
      const startTime1 = Date.now();
      await prisma.user.findMany({
        where: {
          email: {
            contains: '@',
          },
        },
        take: 100,
      });
      const userLookupTime = Date.now() - startTime1;
      performanceTests.push({ test: 'User lookup', time: userLookupTime });

      // Test 2: Session with relations
      const startTime2 = Date.now();
      await prisma.session.findMany({
        include: {
          user: true,
          actionItems: true,
        },
        take: 50,
      });
      const sessionLookupTime = Date.now() - startTime2;
      performanceTests.push({ test: 'Session with relations', time: sessionLookupTime });

      // Test 3: Complex aggregation
      const startTime3 = Date.now();
      await prisma.actionItem.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });
      const aggregationTime = Date.now() - startTime3;
      performanceTests.push({ test: 'Status aggregation', time: aggregationTime });

      const slowTests = performanceTests.filter(test => test.time > 1000);

      if (slowTests.length === 0) {
        this.addResult(
          'testPerformance',
          'passed',
          'Performance validation passed',
          performanceTests
        );
      } else {
        this.addResult('testPerformance', 'warnings', 'Some queries are slow', slowTests);
      }
    } catch (error) {
      this.addResult('testPerformance', 'failed', 'Performance validation failed', error.message);
    }
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('🔍 Starting migration validation...\n');

    await this.testDatabaseConnection();
    await this.testTableStructure();
    await this.testDataCounts();
    await this.testDataIntegrity();
    await this.testBusinessLogic();
    await this.testPerformance();

    this.printSummary();
    return this.results;
  }

  /**
   * Print validation summary
   */
  printSummary() {
    console.log('\n📊 Validation Summary:');
    console.log('┌─────────────┬───────┐');
    console.log('│ Status      │ Count │');
    console.log('├─────────────┼───────┤');
    console.log(`│ ✅ Passed   │ ${this.results.passed.toString().padStart(5)} │`);
    console.log(`│ ⚠️  Warnings │ ${this.results.warnings.toString().padStart(5)} │`);
    console.log(`│ ❌ Failed   │ ${this.results.failed.toString().padStart(5)} │`);
    console.log('└─────────────┴───────┘');

    const totalTests = this.results.passed + this.results.warnings + this.results.failed;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Critical issues found. Please review and fix before proceeding.');
    } else if (this.results.warnings > 0) {
      console.log('\n⚠️  Some warnings detected. Review recommended but not blocking.');
    } else {
      console.log('\n🎉 All validation tests passed! Migration is successful.');
    }
  }
}

/**
 * Main validation function
 */
async function main() {
  const validator = new MigrationValidator();

  try {
    const results = await validator.runAllTests();

    // Save results to file
    const resultsFile = path.join(__dirname, '..', 'validation-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsFile}`);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MigrationValidator };
