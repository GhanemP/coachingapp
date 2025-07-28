# SmartSource Coaching Hub - Deployment Guide

## 🚀 Production Deployment Guide

This guide covers the complete deployment process for the SmartSource Coaching Hub application, from development to production environments.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Database Setup](#database-setup)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Configuration](#security-configuration)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **Docker**: 20.x or higher
- **Kubernetes**: 1.25+ (for K8s deployment)
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher

### Required Accounts & Services
- GitHub account (for CI/CD)
- Docker Hub or Container Registry
- Cloud provider account (AWS/GCP/Azure)
- Sentry account (for monitoring)
- Slack workspace (for notifications)

## 🌍 Environment Setup

### Environment Variables

Create the following environment files:

#### `.env.production`
```bash
# Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://coaching-hub.example.com
NEXTAUTH_SECRET=your-super-secure-secret-key-here

# Database
DATABASE_URL=postgresql://user:password@host:5432/coaching_hub

# Cache
REDIS_URL=redis://user:password@host:6379

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Security
ENCRYPTION_KEY=your-64-character-encryption-key
FIELD_ENCRYPTION_KEY=your-64-character-field-encryption-key

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# Features
ENABLE_REAL_TIME=true
ENABLE_ANALYTICS=true
ENABLE_MULTI_TENANT=false
```

#### `.env.staging`
```bash
# Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://staging.coaching-hub.example.com
NEXTAUTH_SECRET=staging-secret-key

# Database
DATABASE_URL=postgresql://staging_user:password@staging-host:5432/coaching_hub_staging

# Cache
REDIS_URL=redis://staging-host:6379

# Other variables same as production but with staging values
```

### GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

```bash
# AWS/Cloud Provider
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
EKS_CLUSTER_NAME=coaching-hub-cluster

# Database
STAGING_DATABASE_URL=postgresql://...
PRODUCTION_DATABASE_URL=postgresql://...

# Cache
STAGING_REDIS_URL=redis://...
PRODUCTION_REDIS_URL=redis://...

# Authentication
STAGING_NEXTAUTH_SECRET=staging-secret
PRODUCTION_NEXTAUTH_SECRET=production-secret

# Security
ENCRYPTION_KEY=your-encryption-key
FIELD_ENCRYPTION_KEY=your-field-encryption-key

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
CODECOV_TOKEN=your-codecov-token
SNYK_TOKEN=your-snyk-token

# Notifications
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# Testing
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password

# Performance
LHCI_GITHUB_APP_TOKEN=your-lighthouse-token
```

## 🔄 CI/CD Pipeline

### Pipeline Overview

The CI/CD pipeline consists of two main workflows:

1. **Continuous Integration** (`.github/workflows/ci.yml`)
   - Code quality checks (ESLint, Prettier, TypeScript)
   - Security scanning (npm audit, Snyk)
   - Unit and integration tests
   - End-to-end tests
   - Build and bundle analysis
   - Performance testing

2. **Continuous Deployment** (`.github/workflows/cd.yml`)
   - Docker image building and pushing
   - Staging deployment
   - Production deployment (with manual approval)
   - Database migrations
   - Security scanning of deployed images
   - Performance monitoring

### Triggering Deployments

```bash
# Automatic staging deployment
git push origin main

# Production deployment (requires manual approval)
# 1. Push to main triggers staging deployment
# 2. Manual approval required for production
# 3. Production deployment proceeds after approval
```

### Pipeline Status

Monitor pipeline status at:
- GitHub Actions: `https://github.com/your-org/coaching-app/actions`
- Deployment notifications in Slack `#deployments` channel

## 🐳 Docker Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# Start with specific profiles
docker-compose --profile production up -d
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Docker Setup

```bash
# Build production image
docker build -t coaching-hub:latest .

# Run with production configuration
docker run -d \
  --name coaching-hub \
  -p 3000:3000 \
  --env-file .env.production \
  coaching-hub:latest

# Health check
curl -f http://localhost:3000/api/health
```

## ☸️ Kubernetes Deployment

### Cluster Setup

```bash
# Create namespaces
kubectl create namespace staging
kubectl create namespace production

# Create secrets
kubectl create secret generic coaching-hub-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=redis-url="$REDIS_URL" \
  --from-literal=nextauth-secret="$NEXTAUTH_SECRET" \
  --from-literal=sentry-dsn="$SENTRY_DSN" \
  --from-literal=encryption-key="$ENCRYPTION_KEY" \
  --from-literal=field-encryption-key="$FIELD_ENCRYPTION_KEY" \
  -n production

# Apply the same for staging namespace
```

### Deployment Commands

```bash
# Deploy to staging
envsubst < k8s/staging/deployment.yaml | kubectl apply -f -

# Deploy to production
envsubst < k8s/production/deployment.yaml | kubectl apply -f -

# Check deployment status
kubectl rollout status deployment/coaching-hub-production -n production

# Scale deployment
kubectl scale deployment coaching-hub-production --replicas=5 -n production
```

### Monitoring Deployments

```bash
# Check pod status
kubectl get pods -n production -l app=coaching-hub-production

# View logs
kubectl logs -f deployment/coaching-hub-production -n production

# Check service endpoints
kubectl get svc -n production

# Check ingress
kubectl get ingress -n production
```

## 🗄️ Database Setup

### PostgreSQL Configuration

#### Production Database Setup

```sql
-- Create database and user
CREATE DATABASE coaching_hub;
CREATE USER coaching_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE coaching_hub TO coaching_user;

-- Enable required extensions
\c coaching_hub;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
```

#### Migration Process

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (if needed)
npm run db:seed

# Verify migration
npx prisma db pull
```

### Redis Configuration

```bash
# Redis production configuration
# /etc/redis/redis.conf

# Security
requirepass your-secure-redis-password
bind 127.0.0.1 ::1

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## 📊 Monitoring & Logging

### Sentry Configuration

```javascript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

### Application Monitoring

```bash
# Health check endpoint
curl https://coaching-hub.example.com/api/health

# Database monitoring
curl https://coaching-hub.example.com/api/monitoring/database

# Performance metrics
curl https://coaching-hub.example.com/api/metrics
```

### Log Aggregation

```bash
# View application logs
kubectl logs -f deployment/coaching-hub-production -n production

# View logs from all pods
kubectl logs -f -l app=coaching-hub-production -n production

# Export logs
kubectl logs deployment/coaching-hub-production -n production > app.log
```

## 🔒 Security Configuration

### SSL/TLS Setup

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create cluster issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Security Headers

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name coaching-hub.example.com;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
    
    location / {
        proxy_pass http://coaching-hub-service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 💾 Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="coaching_hub"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/
```

### Disaster Recovery

```bash
# Restore from backup
gunzip backup_20240101_120000.sql.gz
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_20240101_120000.sql

# Verify restoration
npm run db:verify

# Restart application
kubectl rollout restart deployment/coaching-hub-production -n production
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
kubectl logs deployment/coaching-hub-production -n production

# Check environment variables
kubectl exec -it deployment/coaching-hub-production -n production -- env

# Check database connectivity
kubectl exec -it deployment/coaching-hub-production -n production -- npm run db:check
```

#### Database Connection Issues

```bash
# Test database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Check database status
kubectl get pods -n production | grep postgres

# Restart database
kubectl rollout restart deployment/postgres -n production
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n production

# Scale up application
kubectl scale deployment coaching-hub-production --replicas=5 -n production

# Check database performance
kubectl exec -it postgres-pod -- psql -U coaching_user -d coaching_hub -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

### Health Checks

```bash
# Application health
curl -f https://coaching-hub.example.com/api/health

# Database health
kubectl exec -it postgres-pod -- pg_isready

# Redis health
kubectl exec -it redis-pod -- redis-cli ping
```

### Rollback Procedures

```bash
# Rollback Kubernetes deployment
kubectl rollout undo deployment/coaching-hub-production -n production

# Rollback database migration
npx prisma migrate reset --force
npx prisma migrate deploy --to 20240101000000_previous_migration

# Rollback to previous Docker image
docker pull coaching-hub:previous-tag
kubectl set image deployment/coaching-hub-production coaching-hub=coaching-hub:previous-tag -n production
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review application logs
   - Check database performance
   - Update dependencies (security patches)
   - Verify backup integrity

2. **Monthly**
   - Security audit
   - Performance optimization
   - Capacity planning review
   - Update documentation

3. **Quarterly**
   - Disaster recovery testing
   - Security penetration testing
   - Infrastructure cost optimization
   - Technology stack updates

### Emergency Contacts

- **DevOps Team**: devops@example.com
- **Database Admin**: dba@example.com
- **Security Team**: security@example.com
- **On-call Engineer**: +1-555-0123

### Monitoring Dashboards

- **Application Metrics**: https://grafana.example.com/coaching-hub
- **Infrastructure**: https://cloudwatch.aws.amazon.com/
- **Error Tracking**: https://sentry.io/coaching-hub
- **Uptime Monitoring**: https://status.example.com

---

*This deployment guide is maintained by the SmartSource DevOps Team. Last updated: 2024-01-01*