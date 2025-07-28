# PostgreSQL Setup Guide

This guide explains how to set up and use PostgreSQL with the SmartSource Coaching Hub application.

## Overview

The application has been migrated from SQLite to PostgreSQL for production readiness. This setup includes:

- **PostgreSQL 15**: Main database server
- **PgBouncer**: Connection pooling for better performance
- **pgAdmin**: Web-based database administration
- **Redis**: Caching and session storage (optional)
- **Docker Compose**: Container orchestration for development

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- Git repository cloned

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# The default Docker settings should work for development
```

### 3. Start Database Services

```bash
# Start PostgreSQL and related services
docker-compose up -d postgres postgres-shadow pgbouncer

# Or use the setup script
./scripts/setup-database-docker.sh
```

### 4. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate reset --force
npx prisma db push

# Seed with sample data
node scripts/seed-sample-data.js
```

## Database Configuration

### Connection Strings

The application supports multiple connection configurations:

```env
# Direct PostgreSQL connection
DATABASE_URL="postgresql://coaching_user:coaching123@localhost:5432/coaching_app"

# Connection through PgBouncer (recommended for production)
DATABASE_URL_POOLED="postgresql://coaching_user:coaching123@localhost:6432/coaching_app"

# Shadow database for Prisma migrations
SHADOW_DATABASE_URL="postgresql://coaching_user:coaching123@localhost:5433/coaching_app_shadow"
```

### Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| PostgreSQL Shadow | 5433 | Migration testing |
| PgBouncer | 6432 | Connection pooling |
| pgAdmin | 5050 | Database administration |
| Redis | 6379 | Caching (optional) |

## Data Migration

### From SQLite to PostgreSQL

If you have existing SQLite data, use the migration script:

```bash
# Install sqlite3 dependency if not present
npm install sqlite3

# Run migration script
node scripts/migrate-sqlite-to-postgres.js
```

The migration script will:
1. Export all data from SQLite
2. Transform data for PostgreSQL compatibility
3. Import data to PostgreSQL
4. Validate the migration
5. Provide a detailed report

### Manual Migration

For manual data migration:

```bash
# Export SQLite data
sqlite3 prisma/dev.db .dump > backup.sql

# Import to PostgreSQL (requires manual SQL conversion)
# This is more complex and the automated script is recommended
```

## Database Administration

### Using pgAdmin

1. Open http://localhost:5050
2. Login with:
   - Email: `admin@coaching.local`
   - Password: `admin123`
3. Add server connection:
   - Host: `postgres` (or `localhost` from outside Docker)
   - Port: `5432`
   - Database: `coaching_app`
   - Username: `coaching_user`
   - Password: `coaching123`

### Using Command Line

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U coaching_user -d coaching_app

# View database size
SELECT pg_size_pretty(pg_database_size('coaching_app'));

# List all tables
\dt

# Describe table structure
\d table_name

# Exit psql
\q
```

## Performance Optimization

### Connection Pooling with PgBouncer

PgBouncer is configured with:
- **Pool Mode**: Transaction-level pooling
- **Max Connections**: 25 client connections
- **Pool Size**: 20 server connections
- **Timeouts**: Optimized for web applications

### Database Tuning

Key PostgreSQL settings for production:

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Backup and Recovery

### Automated Backups

```bash
# Create backup
docker-compose exec postgres pg_dump -U coaching_user -d coaching_app > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U coaching_user -d coaching_app < backup.sql
```

### Backup Script

```bash
#!/bin/bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U coaching_user -d coaching_app > "backup_${TIMESTAMP}.sql"
echo "Backup created: backup_${TIMESTAMP}.sql"
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # View logs
   docker-compose logs postgres
   ```

2. **Permission Denied**
   ```bash
   # Reset permissions
   docker-compose exec postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE coaching_app TO coaching_user;"
   ```

3. **Migration Errors**
   ```bash
   # Reset database
   npx prisma migrate reset --force
   
   # Regenerate client
   npx prisma generate
   ```

### Performance Issues

1. **Slow Queries**
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   ```

2. **Connection Limits**
   ```bash
   # Check current connections
   docker-compose exec postgres psql -U coaching_user -d coaching_app -c "SELECT count(*) FROM pg_stat_activity;"
   ```

## Production Deployment

### Environment Variables

```env
# Production database (update with your credentials)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
DATABASE_URL_POOLED="postgresql://username:password@pooler-host:port/database?sslmode=require"

# Enable SSL
PGSSLMODE=require
```

### Security Considerations

1. **Use strong passwords**
2. **Enable SSL connections**
3. **Restrict network access**
4. **Regular security updates**
5. **Monitor access logs**

### Monitoring

Recommended monitoring tools:
- **pg_stat_statements**: Query performance
- **pgBadger**: Log analysis
- **Prometheus + Grafana**: Metrics and dashboards
- **Sentry**: Error tracking (configured in Phase 1.3)

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `setup-database-docker.sh` | Complete Docker-based setup |
| `migrate-sqlite-to-postgres.js` | Data migration from SQLite |
| `init-db.sql` | Database initialization |

## Next Steps

After PostgreSQL setup is complete:
1. **Phase 1.3**: Application Performance Monitoring (APM)
2. **Phase 2**: Code Quality & Architecture Refinement
3. **Phase 3**: Security & Performance Optimization
4. **Phase 4**: Documentation & Deployment Readiness

For support, refer to the main project documentation or create an issue in the repository.