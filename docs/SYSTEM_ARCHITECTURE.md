# SmartSource Coaching Hub - System Architecture Documentation

## 🏗️ Architecture Overview

The SmartSource Coaching Hub is a modern, scalable web application built with Next.js 15, featuring a comprehensive coaching management platform with real-time capabilities, robust security, and production-ready infrastructure.

## 📋 Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [System Components](#system-components)
4. [Data Architecture](#data-architecture)
5. [Security Architecture](#security-architecture)
6. [Performance & Scalability](#performance--scalability)
7. [Deployment Architecture](#deployment-architecture)
8. [Monitoring & Observability](#monitoring--observability)
9. [Development Workflow](#development-workflow)

## 🎯 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  API Clients  │  Admin Tools    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│           Next.js 15 App Router (React 18)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Pages     │ │ Components  │ │   Layouts   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                    Next.js API Routes                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │    REST     │ │  WebSocket  │ │   GraphQL   │              │
│  │    APIs     │ │   Server    │ │  (Future)   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Services  │ │ Middleware  │ │ Validation  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Auth Logic  │ │   Caching   │ │   Logging   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                      Prisma ORM                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Models    │ │ Migrations  │ │ Middleware  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ PostgreSQL  │ │    Redis    │ │   Sentry    │              │
│  │  Database   │ │   Cache     │ │ Monitoring  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend Technologies

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Custom Components
- **State Management**: React Context + Server State
- **Forms**: React Hook Form + Zod Validation
- **Real-time**: WebSocket + Server-Sent Events

### Backend Technologies

- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Database ORM**: Prisma 5.x
- **Authentication**: NextAuth.js v5
- **Validation**: Zod Schema Validation
- **File Processing**: Multer + Sharp

### Database & Storage

- **Primary Database**: PostgreSQL 15+
- **Caching**: Redis 7.x
- **File Storage**: Local/S3-compatible
- **Search**: PostgreSQL Full-Text Search

### DevOps & Infrastructure

- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry + Custom Logging
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + Prettier + TypeScript

## 🧩 System Components

### 1. Authentication & Authorization System

```typescript
// Authentication Flow
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│ NextAuth.js │───▶│  Database   │
│  (Browser)  │    │   Server    │    │   (Users)   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Session   │    │    JWT      │    │    RBAC     │
│   Cookie    │    │   Tokens    │    │   System    │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Key Features:**

- Multi-provider authentication (Credentials, Google OAuth)
- Role-based access control (Admin, Manager, Team Leader, Agent)
- Session management with secure cookies
- JWT token support for API access
- Password security with bcrypt hashing

### 2. Real-time Communication System

```typescript
// WebSocket Architecture
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │◄──▶│  WebSocket  │◄──▶│   Server    │
│  Browser    │    │   Server    │    │   Events    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ UI Updates  │    │ Connection  │    │ Broadcast   │
│ Real-time   │    │ Management  │    │  System     │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Supported Events:**

- Quick note creation/updates
- Action item status changes
- Session scheduling notifications
- Performance metric updates
- System-wide announcements

### 3. Caching Strategy

```typescript
// Multi-layer Caching
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │   Server    │    │    Redis    │
│   Cache     │    │   Cache     │    │   Cache     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Static      │    │ Memory      │    │ Distributed │
│ Assets      │    │ Cache       │    │ Cache       │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Cache Layers:**

- **L1 (Browser)**: Static assets, API responses (5-15 minutes)
- **L2 (Server Memory)**: Frequently accessed data (2-5 minutes)
- **L3 (Redis)**: User sessions, computed data (30 minutes - 1 hour)
- **L4 (Database)**: Query result caching with Prisma

## 🗄️ Data Architecture

### Database Schema Overview

```sql
-- Core Entities Relationship
Users (1) ──── (N) CoachingSessions
  │                      │
  │                      │
  └── (1:N) ──── ActionItems ──── (N:1) ActionPlans
  │                      │
  │                      │
  └── (1:N) ──── QuickNotes
  │
  └── (1:N) ──── AgentMetrics
```

### Key Database Tables

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'AGENT',
  employee_id VARCHAR(50),
  department VARCHAR(100),
  managed_by UUID REFERENCES users(id),
  team_leader_id UUID REFERENCES users(id),
  hashed_password TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Coaching Sessions Table

```sql
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id),
  team_leader_id UUID NOT NULL REFERENCES users(id),
  session_date TIMESTAMP,
  scheduled_date TIMESTAMP NOT NULL,
  duration INTEGER DEFAULT 60,
  status session_status DEFAULT 'SCHEDULED',
  session_notes TEXT,
  preparation_notes TEXT,
  action_items TEXT,
  previous_score DECIMAL(5,2),
  current_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Data Flow Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│     API     │───▶│  Validation │
│  Request    │    │   Route     │    │   Layer     │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Database   │◄───│   Prisma    │◄───│  Business   │
│ PostgreSQL  │    │    ORM      │    │   Logic     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Audit     │    │   Cache     │    │  Response   │
│    Log      │    │ Invalidate  │    │ Transform   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔒 Security Architecture

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───▶│  Validate   │───▶│   Create    │
│  Request    │    │ Credentials │    │  Session    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Rate      │    │  Password   │    │   Secure    │
│  Limiting   │    │   Hashing   │    │   Cookie    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Security Layers

1. **Network Security**
   - HTTPS enforcement in production
   - CORS configuration for API access
   - Rate limiting per IP and user
   - Request size limits

2. **Authentication Security**
   - bcrypt password hashing (12 rounds)
   - Secure session cookies (httpOnly, secure, sameSite)
   - JWT tokens with expiration
   - Multi-factor authentication ready

3. **Authorization Security**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API endpoint protection
   - UI component-level access control

4. **Data Security**
   - AES-256 encryption for sensitive data
   - Field-level encryption for PII
   - SQL injection prevention (Prisma ORM)
   - XSS protection with CSP headers

5. **Audit & Compliance**
   - Comprehensive audit logging
   - User activity tracking
   - Data access monitoring
   - GDPR compliance features

## ⚡ Performance & Scalability

### Performance Optimizations

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE STACK                            │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Optimizations                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Code      │ │   Image     │ │   Bundle    │              │
│  │ Splitting   │ │Optimization │ │ Analysis    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Backend Optimizations                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  Database   │ │   Caching   │ │ Connection  │              │
│  │  Indexing   │ │  Strategy   │ │   Pooling   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Scalability Strategy

1. **Horizontal Scaling**
   - Stateless application design
   - Load balancer ready
   - Database read replicas
   - Redis cluster support

2. **Vertical Scaling**
   - Efficient memory usage
   - CPU optimization
   - Database query optimization
   - Connection pooling

3. **Caching Strategy**
   - Multi-layer caching
   - Cache invalidation patterns
   - CDN integration ready
   - Edge caching support

### Performance Metrics

- **Page Load Time**: < 2 seconds (target)
- **API Response Time**: < 200ms (average)
- **Database Query Time**: < 50ms (average)
- **Cache Hit Ratio**: > 80%
- **Concurrent Users**: 1000+ supported

## 🚀 Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION STACK                           │
├─────────────────────────────────────────────────────────────────┤
│  Load Balancer (Nginx/CloudFlare)                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   App       │ │   App       │ │   App       │              │
│  │ Instance 1  │ │ Instance 2  │ │ Instance N  │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Database Layer                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ PostgreSQL  │ │    Redis    │ │   Backup    │              │
│  │  Primary    │ │   Cluster   │ │   Storage   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Container Architecture

```dockerfile
# Multi-stage Docker build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=coaching_hub
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
```

## 📊 Monitoring & Observability

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│  Application Monitoring                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Sentry    │ │   Custom    │ │  Winston    │              │
│  │   Error     │ │   Metrics   │ │  Logging    │              │
│  │  Tracking   │ │ Collection  │ │   System    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure Monitoring                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  Database   │ │   Server    │ │   Network   │              │
│  │ Performance │ │   Health    │ │   Metrics   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Metrics Tracked

1. **Application Metrics**
   - Request/response times
   - Error rates and types
   - User session duration
   - Feature usage analytics

2. **Database Metrics**
   - Query performance
   - Connection pool usage
   - Slow query identification
   - Database size and growth

3. **System Metrics**
   - CPU and memory usage
   - Disk I/O performance
   - Network latency
   - Cache hit/miss ratios

### Logging Strategy

```typescript
// Structured logging example
logger.info('User action performed', {
  userId: 'uuid',
  action: 'CREATE_SESSION',
  resource: 'coaching_session',
  metadata: {
    agentId: 'uuid',
    duration: 60,
    timestamp: new Date().toISOString(),
  },
});
```

## 🔄 Development Workflow

### Git Workflow

```
main ←── develop ←── feature/branch
  │         │            │
  │         │            ▼
  │         │       [Development]
  │         │            │
  │         ▼            │
  │    [Staging]         │
  │         │            │
  │         └────────────┘
  ▼
[Production]
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Deploy to production"
```

### Code Quality Gates

1. **Pre-commit Hooks**
   - ESLint code linting
   - Prettier code formatting
   - TypeScript type checking
   - Unit test execution

2. **Pull Request Checks**
   - Automated testing
   - Code coverage reports
   - Security vulnerability scanning
   - Performance impact analysis

3. **Deployment Checks**
   - Integration testing
   - Database migration validation
   - Environment configuration verification
   - Health check validation

## 📈 Future Architecture Considerations

### Planned Enhancements

1. **Microservices Migration**
   - Service decomposition strategy
   - API gateway implementation
   - Service mesh adoption
   - Event-driven architecture

2. **Advanced Caching**
   - CDN integration
   - Edge computing support
   - Advanced cache strategies
   - Real-time cache invalidation

3. **Enhanced Security**
   - Zero-trust architecture
   - Advanced threat detection
   - Automated security scanning
   - Compliance automation

4. **Scalability Improvements**
   - Auto-scaling capabilities
   - Multi-region deployment
   - Database sharding
   - Event streaming platform

## 🔧 Configuration Management

### Environment Variables

```bash
# Core Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://coaching-hub.example.com
NEXTAUTH_SECRET=your-secret-key

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/coaching_hub
REDIS_URL=redis://localhost:6379

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# Security
ENCRYPTION_KEY=your-encryption-key
FIELD_ENCRYPTION_KEY=your-field-encryption-key
```

### Feature Flags

```typescript
// Feature flag configuration
export const FEATURE_FLAGS = {
  REAL_TIME_NOTIFICATIONS: process.env.ENABLE_REAL_TIME === 'true',
  ADVANCED_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  MULTI_TENANT_SUPPORT: process.env.ENABLE_MULTI_TENANT === 'true',
  MOBILE_APP_SUPPORT: process.env.ENABLE_MOBILE === 'true',
};
```

---

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](../prisma/schema.prisma)
- [Security Audit Report](./RBAC_SECURITY_AUDIT_REPORT.md)
- [Performance Optimization Guide](./PERFORMANCE_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

_This architecture documentation is maintained by the SmartSource Development Team and is updated with each major release._
