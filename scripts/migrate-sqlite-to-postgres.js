#!/usr/bin/env node

/* eslint-disable */

/**
 * SQLite to PostgreSQL Migration Script
 *
 * This script safely migrates data from the existing SQLite database
 * to the new PostgreSQL database while preserving all relationships
 * and data integrity.
 */

const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_DB_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initialize Prisma client for PostgreSQL
const prisma = new PrismaClient();

/**
 * Create a backup of the current PostgreSQL database
 */
async function createPostgresBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `postgres-backup-${timestamp}.sql`);
    
    console.log('📦 Creating PostgreSQL backup...');
    
    try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        await execPromise(`docker-compose exec -T postgres pg_dump -U coaching_user -d coaching_app > ${backupFile}`);
        console.log(`✅ PostgreSQL backup created: ${backupFile}`);
        return backupFile;
    } catch (error) {
        console.warn('⚠️  Could not create PostgreSQL backup:', error.message);
        return null;
    }
}

/**
 * Export data from SQLite database
 */
async function exportSQLiteData() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(SQLITE_DB_PATH)) {
            console.log('ℹ️  No SQLite database found. Skipping migration.');
            resolve({});
            return;
        }

        console.log('📤 Exporting data from SQLite database...');
        
        const db = new sqlite3.Database(SQLITE_DB_PATH);
        const data = {};

        // Define tables in dependency order (tables with no foreign keys first)
        const tables = [
            'User',
            'Team',
            'Agent',
            'Session',
            'ActionItem',
            'QuickNote',
            'Scorecard',
            'Notification'
        ];

        let completed = 0;

        tables.forEach(tableName => {
            const query = `SELECT * FROM ${tableName}`;
            
            db.all(query, [], (err, rows) => {
                if (err) {
                    console.warn(`⚠️  Could not export ${tableName}:`, err.message);
                    data[tableName] = [];
                } else {
                    data[tableName] = rows;
                    console.log(`   ✓ Exported ${rows.length} records from ${tableName}`);
                }
                
                completed++;
                if (completed === tables.length) {
                    db.close();
                    resolve(data);
                }
            });
        });
    });
}

/**
 * Transform SQLite data for PostgreSQL compatibility
 */
function transformData(data) {
    console.log('🔄 Transforming data for PostgreSQL...');
    
    const transformed = {};
    
    Object.keys(data).forEach(tableName => {
        transformed[tableName] = data[tableName].map(record => {
            const transformedRecord = { ...record };
            
            // Convert SQLite boolean integers to PostgreSQL booleans
            Object.keys(transformedRecord).forEach(key => {
                const value = transformedRecord[key];
                
                // Handle boolean fields
                if (typeof value === 'number' && (value === 0 || value === 1)) {
                    // Check if this looks like a boolean field
                    if (key.startsWith('is') || key.startsWith('has') || key.includes('Active') || key.includes('Read')) {
                        transformedRecord[key] = value === 1;
                    }
                }
                
                // Handle date fields
                if (key.includes('At') || key.includes('Date')) {
                    if (typeof value === 'string') {
                        transformedRecord[key] = new Date(value);
                    }
                }
                
                // Handle JSON fields
                if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                    try {
                        transformedRecord[key] = JSON.parse(value);
                    } catch (e) {
                        // Keep as string if not valid JSON
                    }
                }
            });
            
            return transformedRecord;
        });
    });
    
    return transformed;
}

/**
 * Import data into PostgreSQL
 */
async function importToPostgreSQL(data) {
    console.log('📥 Importing data to PostgreSQL...');
    
    try {
        // Import in dependency order
        const importOrder = [
            { table: 'User', prismaModel: 'user' },
            { table: 'Team', prismaModel: 'team' },
            { table: 'Agent', prismaModel: 'agent' },
            { table: 'Session', prismaModel: 'session' },
            { table: 'ActionItem', prismaModel: 'actionItem' },
            { table: 'QuickNote', prismaModel: 'quickNote' },
            { table: 'Scorecard', prismaModel: 'scorecard' },
            { table: 'Notification', prismaModel: 'notification' }
        ];

        for (const { table, prismaModel } of importOrder) {
            if (data[table] && data[table].length > 0) {
                console.log(`   Importing ${data[table].length} records to ${table}...`);
                
                try {
                    // Use createMany for bulk insert
                    await prisma[prismaModel].createMany({
                        data: data[table],
                        skipDuplicates: true
                    });
                    console.log(`   ✅ Successfully imported ${table}`);
                } catch (error) {
                    console.error(`   ❌ Error importing ${table}:`, error.message);
                    
                    // Try individual inserts if bulk insert fails
                    console.log(`   🔄 Attempting individual inserts for ${table}...`);
                    let successCount = 0;
                    
                    for (const record of data[table]) {
                        try {
                            await prisma[prismaModel].create({ data: record });
                            successCount++;
                        } catch (individualError) {
                            console.warn(`     ⚠️  Skipped record in ${table}:`, individualError.message);
                        }
                    }
                    
                    console.log(`   ✅ Imported ${successCount}/${data[table].length} records from ${table}`);
                }
            } else {
                console.log(`   ℹ️  No data to import for ${table}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error during import:', error);
        throw error;
    }
}

/**
 * Validate the migration
 */
async function validateMigration(originalData) {
    console.log('🔍 Validating migration...');
    
    const validationResults = {};
    
    try {
        // Count records in each table
        const counts = {
            users: await prisma.user.count(),
            teams: await prisma.team.count(),
            agents: await prisma.agent.count(),
            sessions: await prisma.session.count(),
            actionItems: await prisma.actionItem.count(),
            quickNotes: await prisma.quickNote.count(),
            scorecards: await prisma.scorecard.count(),
            notifications: await prisma.notification.count()
        };
        
        // Compare with original counts
        const originalCounts = {
            users: originalData.User?.length || 0,
            teams: originalData.Team?.length || 0,
            agents: originalData.Agent?.length || 0,
            sessions: originalData.Session?.length || 0,
            actionItems: originalData.ActionItem?.length || 0,
            quickNotes: originalData.QuickNote?.length || 0,
            scorecards: originalData.Scorecard?.length || 0,
            notifications: originalData.Notification?.length || 0
        };
        
        console.log('\n📊 Migration Summary:');
        console.log('┌─────────────────┬──────────┬──────────┬────────┐');
        console.log('│ Table           │ Original │ Migrated │ Status │');
        console.log('├─────────────────┼──────────┼──────────┼────────┤');
        
        Object.keys(counts).forEach(table => {
            const original = originalCounts[table];
            const migrated = counts[table];
            const status = migrated >= original ? '✅' : '⚠️';
            
            console.log(`│ ${table.padEnd(15)} │ ${original.toString().padStart(8)} │ ${migrated.toString().padStart(8)} │   ${status}    │`);
            validationResults[table] = { original, migrated, success: migrated >= original };
        });
        
        console.log('└─────────────────┴──────────┴──────────┴────────┘');
        
        return validationResults;
        
    } catch (error) {
        console.error('❌ Error during validation:', error);
        return null;
    }
}

/**
 * Main migration function
 */
async function main() {
    console.log('🚀 Starting SQLite to PostgreSQL migration...\n');
    
    try {
        // Step 1: Create backup
        await createPostgresBackup();
        
        // Step 2: Export SQLite data
        const sqliteData = await exportSQLiteData();
        
        if (Object.keys(sqliteData).length === 0) {
            console.log('✅ No data to migrate. Migration completed.');
            return;
        }
        
        // Step 3: Transform data
        const transformedData = transformData(sqliteData);
        
        // Step 4: Import to PostgreSQL
        await importToPostgreSQL(transformedData);
        
        // Step 5: Validate migration
        const validationResults = await validateMigration(sqliteData);
        
        if (validationResults) {
            const allSuccessful = Object.values(validationResults).every(result => result.success);
            
            if (allSuccessful) {
                console.log('\n🎉 Migration completed successfully!');
                console.log('   All data has been migrated from SQLite to PostgreSQL.');
            } else {
                console.log('\n⚠️  Migration completed with warnings.');
                console.log('   Some data may not have been migrated completely.');
                console.log('   Please review the validation results above.');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };