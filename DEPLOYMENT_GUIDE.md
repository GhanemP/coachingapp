# Production Deployment Guide

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database
- Redis server (optional, but recommended)
- Docker and Docker Compose (for containerized deployment)

## Environment Setup

1. **Copy the production environment template:**

   ```bash
   cp .env.production.example .env.production
   ```

2. **Generate secure secrets:**

   ```bash
   # Generate NEXTAUTH_SECRET
   openssl rand -base64 32

   # Generate CSRF_SECRET
   openssl rand -base64 32
   ```

3. **Configure your `.env.production` file with:**
   - Database connection string
   - Authentication URL (your domain)
   - Generated secrets
   - Redis URL (if using)
   - OpenAI API key (if using AI features)

## Deployment Options

### Option 1: Traditional Deployment

1. **Install dependencies:**

   ```bash
   npm ci --production
   ```

2. **Generate Prisma client:**

   ```bash
   npx prisma generate
   ```

3. **Run database migrations:**

   ```bash
   npx prisma migrate deploy
   ```

4. **Build the application:**

   ```bash
   npm run build:prod
   ```

5. **Start the production server:**
   ```bash
   npm start
   ```

### Option 2: Docker Deployment

1. **Build and start with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

2. **View logs:**

   ```bash
   docker-compose logs -f app
   ```

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Option 3: Cloud Deployment

#### Vercel (Recommended for Next.js)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic builds on push

#### Railway/Render

1. Create a new project
2. Connect your GitHub repository
3. Add PostgreSQL and Redis services
4. Configure environment variables
5. Deploy

## Production Checklist

### Security

- [ ] All secrets are properly configured
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] CSRF protection is active

### Database

- [ ] Connection pooling is configured
- [ ] Backups are scheduled
- [ ] Indexes are optimized
- [ ] Migrations are up to date

### Performance

- [ ] Redis caching is enabled
- [ ] Static assets are served via CDN
- [ ] Images are optimized
- [ ] Compression is enabled

### Monitoring

- [ ] Error tracking is set up (e.g., Sentry)
- [ ] Performance monitoring is active
- [ ] Logs are being collected
- [ ] Health checks are configured

## Maintenance

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Rebuild and redeploy
npm run build:prod
```

### Backup Procedures

1. **Database backup:**

   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Application backup:**
   - Use version control (Git)
   - Tag releases
   - Keep deployment history

## Troubleshooting

### Common Issues

1. **Build failures:**
   - Check Node.js version (requires 20+)
   - Clear cache: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

2. **Database connection errors:**
   - Verify DATABASE_URL format
   - Check network connectivity
   - Ensure database is running

3. **Authentication issues:**
   - Verify NEXTAUTH_URL matches your domain
   - Check NEXTAUTH_SECRET is set
   - Ensure callback URLs are configured

4. **Performance issues:**
   - Enable Redis caching
   - Check database query performance
   - Monitor memory usage

## Support

For issues or questions:

1. Check application logs
2. Review error tracking dashboard
3. Consult Next.js documentation
4. Check Prisma documentation

## Version History

- v1.0.0 - Initial production release
  - Core coaching features
  - Authentication system
  - Real-time updates
  - AI-powered insights
