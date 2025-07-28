# Data Migration Guide: SQLite to PostgreSQL

This guide provides step-by-step instructions for safely migrating data from SQLite to PostgreSQL in the SmartSource Coaching Hub application.

## Overview

The migration process includes:

1. **Pre-migration validation** - Verify current SQLite data
2. **PostgreSQL setup** - Configure production-ready database
3. **Data export and transformation** - Convert SQLite data for PostgreSQL
4. **Data import and validation** - Import and verify data integrity
5. **Post-migration testing** - Comprehensive validation suite

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ with npm
- Existing SQLite database (`prisma/dev.db`)
- PostgreSQL setup completed (see [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md))

## Migration Process

### Step 1: Pre-Migration Backup

Create backups of your current data:

```bash
# Create backup directory
mkdir -p backups

# Backup SQLite database
cp prisma/dev.db backups/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# Export SQLite data as SQL dump
sqlite3 prisma/dev.db .dump > backups/sqlite_dump_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Install Dependencies

Ensure all required dependencies are installed:

```bash
# Install dependencies including sqlite3 for migration
npm install

# Verify sqlite3 is available
npm list sqlite3
```

### Step 3: PostgreSQL Setup

Start PostgreSQL services using Docker Compose:

```bash
# Start PostgreSQL and related services
npm run db:setup-postgres

# Or manually with Docker Compose
docker-compose up -d postgres postgres-shadow pgbouncer
```

Verify PostgreSQL is running:

```bash
# Check service status
docker-compose ps

# Test connection
docker-compose exec postgres psql -U coaching_user -d coaching_app -c "SELECT version();"
```

### Step 4: Prepare PostgreSQL Schema

Generate Prisma client and create database schema:

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Create database schema
npx prisma db push

# Verify schema creation
docker-compose exec postgres psql -U coaching_user -d coaching_app -c "\dt"
```

### Step 5: Run Data Migration

Execute the automated migration script:

```bash
# Run the migration script
npm run db:migrate-sqlite

# Or run directly
node scripts/migrate-sqlite-to-postgres.js
```

The migration script will:

- Export all data from SQLite
- Transform data types for PostgreSQL compatibility
- Import data to PostgreSQL with proper relationships
- Provide detailed progress and error reporting

### Step 6: Validate Migration

Run comprehensive validation tests:

```bash
# Run validation suite
npm run db:validate

# Or run directly
node scripts/validate-migration.js
```

The validation includes:

- Database connectivity tests
- Table structure verification
- Data count comparisons
- Data integrity checks
- Business logic validation
- Performance benchmarks

## Migration Script Features

### Data Transformation

The migration script handles:

- **Boolean Conversion**: SQLite integers (0/1) → PostgreSQL booleans
- **Date Handling**: String dates → PostgreSQL timestamps
- **JSON Fields**: String JSON → PostgreSQL JSONB
- **Foreign Keys**: Maintains all relationships
- **Constraints**: Preserves unique constraints and indexes

### Error Handling

- **Graceful Failures**: Continues migration on individual record errors
- **Detailed Logging**: Comprehensive progress and error reporting
- **Rollback Support**: PostgreSQL backup before migration
- **Validation**: Automatic data integrity checks

### Performance Optimization

- **Bulk Inserts**: Uses `createMany` for better performance
- **Transaction Safety**: Atomic operations where possible
- **Memory Efficient**: Streams large datasets
- **Progress Tracking**: Real-time migration status

## Validation Tests

### 1. Database Connection Test

Verifies PostgreSQL connectivity and basic functionality.

### 2. Table Structure Test

Ensures all required tables exist with proper schema.

### 3. Data Count Comparison

Compares record counts between SQLite and PostgreSQL.

### 4. Data Integrity Test

Validates:

- Email format validation
- Foreign key relationships
- Required field constraints

### 5. Business Logic Test

Checks:

- User role assignments
- Session status consistency
- Action item completion logic

### 6. Performance Test

Benchmarks:

- User lookup queries
- Complex joins with relations
- Aggregation operations

## Troubleshooting

### Common Issues

#### 1. Connection Errors

```bash
# Check PostgreSQL status
docker-compose logs postgres

# Restart services
docker-compose restart postgres

# Verify connection string
echo $DATABASE_URL
```

#### 2. Schema Mismatch

```bash
# Reset and recreate schema
npx prisma migrate reset --force
npx prisma db push
```

#### 3. Data Type Errors

```bash
# Check specific table issues
docker-compose exec postgres psql -U coaching_user -d coaching_app -c "SELECT * FROM information_schema.columns WHERE table_name = 'User';"
```

#### 4. Permission Issues

```bash
# Grant permissions
docker-compose exec postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE coaching_app TO coaching_user;"
```

### Migration Failures

If migration fails:

1. **Check logs** for specific error messages
2. **Restore PostgreSQL** from backup if needed
3. **Fix data issues** in SQLite if necessary
4. **Re-run migration** with corrected data

```bash
# Restore from backup (if needed)
docker-compose exec -T postgres psql -U coaching_user -d coaching_app < backups/postgres-backup-[timestamp].sql

# Clean and retry
npx prisma migrate reset --force
npm run db:migrate-sqlite
```

## Post-Migration Steps

### 1. Update Environment Variables

Ensure your `.env` file uses PostgreSQL:

```env
# Use PostgreSQL connection
DATABASE_URL="postgresql://coaching_user:coaching123@localhost:5432/coaching_app"

# Optional: Use connection pooling
# DATABASE_URL="postgresql://coaching_user:coaching123@localhost:6432/coaching_app"
```

### 2. Test Application

Start the application and verify functionality:

```bash
# Start development server
npm run dev

# Test key features:
# - User authentication
# - Session management
# - Action item creation
# - Data persistence
```

### 3. Performance Monitoring

Monitor database performance:

```bash
# Check query performance
docker-compose exec postgres psql -U coaching_user -d coaching_app -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor connections
docker-compose exec postgres psql -U coaching_user -d coaching_app -c "SELECT count(*) FROM pg_stat_activity;"
```

## Rollback Procedure

If you need to rollback to SQLite:

1. **Stop the application**
2. **Update environment variables** to use SQLite
3. **Restore SQLite backup** if needed
4. **Restart application**

```bash
# Update .env
DATABASE_URL="file:./dev.db"

# Restore SQLite backup (if needed)
cp backups/dev.db.backup.[timestamp] prisma/dev.db

# Restart application
npm run dev
```

## Best Practices

### Before Migration

- ✅ Create comprehensive backups
- ✅ Test migration on development data
- ✅ Verify PostgreSQL setup
- ✅ Plan for downtime if needed

### During Migration

- ✅ Monitor progress logs
- ✅ Don't interrupt the process
- ✅ Keep backups accessible
- ✅ Document any issues

### After Migration

- ✅ Run full validation suite
- ✅ Test all application features
- ✅ Monitor performance metrics
- ✅ Update documentation

## Migration Checklist

- [ ] SQLite database backup created
- [ ] PostgreSQL services running
- [ ] Dependencies installed (sqlite3)
- [ ] Prisma schema updated
- [ ] Database schema created
- [ ] Migration script executed successfully
- [ ] Validation tests passed
- [ ] Application tested with PostgreSQL
- [ ] Performance monitoring enabled
- [ ] Documentation updated

## Support

For migration issues:

1. Check the troubleshooting section above
2. Review validation test results
3. Examine migration logs in detail
4. Consult PostgreSQL setup documentation
5. Create an issue with detailed error information

## Next Steps

After successful migration:

1. **Phase 1.3**: Application Performance Monitoring (APM)
2. **Phase 2**: Code Quality & Architecture Refinement
3. **Production Deployment**: Configure production PostgreSQL
4. **Monitoring Setup**: Implement comprehensive monitoring

The migration to PostgreSQL provides a solid foundation for production deployment with improved performance, scalability, and reliability.
