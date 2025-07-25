# PostgreSQL Migration Guide

This guide walks through the process of migrating from SQLite to PostgreSQL for the Coach App v2.

## Prerequisites

1. PostgreSQL installed and running
2. A PostgreSQL database created for the application
3. Environment variables configured

## Migration Steps

### 1. Update Environment Variables

Ensure your `.env` file has the PostgreSQL connection string:

```bash
# PostgreSQL Database URL
DATABASE_URL="postgresql://username:password@localhost:5432/coaching_app_v2?schema=public"

# Keep SQLite URL for migration (temporary)
SQLITE_DATABASE_URL="file:./prisma/dev.db"
```

### 2. Generate Prisma Client for PostgreSQL

Since the schema is already configured for PostgreSQL, generate the client:

```bash
npx prisma generate
```

### 3. Create PostgreSQL Schema

Push the schema to your PostgreSQL database:

```bash
npx prisma db push
```

This will create all the tables and relationships in PostgreSQL.

### 4. Run the Migration Script

Execute the migration script to transfer all data from SQLite to PostgreSQL:

```bash
npm run migrate:postgres
```

The script will:
- Connect to both SQLite and PostgreSQL databases
- Transfer all data in the correct order (respecting foreign key constraints)
- Verify the migration by comparing record counts
- Provide a summary of the migration

### 5. Verify the Migration

After the migration completes successfully:

1. Check the migration output for any errors
2. Verify record counts match between databases
3. Test the application with PostgreSQL

### 6. Update Application Configuration

Once migration is verified:

1. Remove the `SQLITE_DATABASE_URL` from `.env`
2. Ensure all application code uses the PostgreSQL connection
3. Test all features thoroughly

### 7. Backup and Cleanup

1. Keep a backup of the SQLite database file
2. After confirming everything works, you can remove the SQLite file
3. Remove the migration script if no longer needed

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify PostgreSQL is running
   - Check connection string format
   - Ensure database exists

2. **Permission Errors**
   - Ensure PostgreSQL user has CREATE/INSERT permissions
   - Check database ownership

3. **Data Type Mismatches**
   - The schema is already optimized for PostgreSQL
   - JSON fields are handled automatically by Prisma

4. **Foreign Key Violations**
   - The migration script handles dependencies in order
   - If errors occur, check for data integrity issues in SQLite

### Rollback Plan

If issues occur:

1. Drop all tables in PostgreSQL: `npx prisma db push --force-reset`
2. Fix any issues in the migration script
3. Re-run the migration

## Performance Considerations

After migration:

1. Run `ANALYZE` on PostgreSQL to update statistics
2. Consider adding additional indexes based on query patterns
3. Monitor query performance and adjust as needed

## Next Steps

After successful migration:

1. Enable connection pooling for production
2. Set up regular PostgreSQL backups
3. Configure monitoring and alerts
4. Update deployment scripts