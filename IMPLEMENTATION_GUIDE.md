# Coach App v2 Implementation Guide

## Overview
This guide provides detailed technical instructions for implementing the missing features and addressing the gaps identified in the Coach App v2 analysis.

## 1. Database Migration Guide

### Step 1: PostgreSQL Setup
```bash
# Install PostgreSQL dependencies
npm install @prisma/client@latest prisma@latest

# Update .env file
DATABASE_URL="postgresql://username:password@localhost:5432/coach_app_v2"
```

### Step 2: Update Prisma Schema
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add missing models
model QuickNote {
  id          String   @id @default(cuid())
  agentId     String
  authorId    String
  content     String   @db.Text
  category    String
  isPrivate   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  agent       User     @relation("AgentQuickNotes", fields: [agentId], references: [id])
  author      User     @relation("AuthorQuickNotes", fields: [authorId], references: [id])
  
  @@index([agentId, createdAt])
  @@index([authorId])
}

model ActionItem {
  id              String    @id @default(cuid())
  agentId         String
  sessionId       String?
  title           String
  description     String    @db.Text
  priority        String    // HIGH, MEDIUM, LOW
  status          String    // PENDING, IN_PROGRESS, COMPLETED
  dueDate         DateTime
  completedDate   DateTime?
  createdBy       String
  assignedTo      String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  agent           User      @relation("AgentActionItems", fields: [agentId], references: [id])
  session         CoachingSession? @relation(fields: [sessionId], references: [id])
  creator         User      @relation("CreatorActionItems", fields: [createdBy], references: [id])
  assignee        User      @relation("AssigneeActionItems", fields: [assignedTo], references: [id])
  
  @@index([agentId, status])
  @@index([dueDate])
}

model ActionPlan {
  id              String    @id @default(cuid())
  agentId         String
  title           String
  description     String    @db.Text
  startDate       DateTime
  endDate         DateTime
  status          String    // DRAFT, ACTIVE, COMPLETED, CANCELLED
  createdBy       String
  approvedBy      String?
  approvedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  agent           User      @relation("AgentActionPlans", fields: [agentId], references: [id])
  creator         User      @relation("CreatorActionPlans", fields: [createdBy], references: [id])
  approver        User?     @relation("ApproverActionPlans", fields: [approvedBy], references: [id])
  items           ActionPlanItem[]
  
  @@index([agentId, status])
}

model ActionPlanItem {
  id              String    @id @default(cuid())
  actionPlanId    String
  title           String
  description     String    @db.Text
  targetMetric    String
  targetValue     Float
  currentValue    Float?
  dueDate         DateTime
  status          String    // PENDING, IN_PROGRESS, COMPLETED
  completedDate   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  actionPlan      ActionPlan @relation(fields: [actionPlanId], references: [id], onDelete: Cascade)
  
  @@index([actionPlanId, status])
}
```

### Step 3: Run Migration
```bash
# Generate migration
npx prisma migrate dev --name add_v2_models

# Apply migration
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## 2. Excel Import/Export Implementation

### Step 1: Install Dependencies
```bash
npm install xlsx multer @types/multer
```

### Step 2: Create Excel Service
```typescript
// src/lib/excel.service.ts
import * as XLSX from 'xlsx';
import { z } from 'zod';

const AgentMetricImportSchema = z.object({
  employeeId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
  service: z.number().min(0).max(5),
  productivity: z.number().min(0).max(5),
  quality: z.number().min(0).max(5),
  assiduity: z.number().min(0).max(5),
  performance: z.number().min(0).max(5),
  adherence: z.number().min(0).max(5),
  lateness: z.number().min(0).max(5),
  breakExceeds: z.number().min(0).max(5),
});

export class ExcelService {
  static async parseMetricsFile(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const validatedData = [];
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      try {
        const validated = AgentMetricImportSchema.parse(data[i]);
        validatedData.push(validated);
      } catch (error) {
        errors.push({
          row: i + 2, // Excel rows start at 1, plus header
          error: error instanceof z.ZodError ? error.errors : 'Invalid data'
        });
      }
    }
    
    return { data: validatedData, errors };
  }
  
  static generateMetricsTemplate() {
    const template = [
      {
        employeeId: 'EMP001',
        month: 1,
        year: 2025,
        service: 4.5,
        productivity: 4.0,
        quality: 4.2,
        assiduity: 5.0,
        performance: 4.3,
        adherence: 4.8,
        lateness: 4.5,
        breakExceeds: 4.7,
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Metrics Template');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
  
  static async exportMetrics(metrics: any[]) {
    const worksheet = XLSX.utils.json_to_sheet(metrics);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agent Metrics');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
```

### Step 3: Create Import API Route
```typescript
// src/app/api/import/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { ExcelService } from '@/lib/excel.service';
import { UserRole } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || ![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, errors } = await ExcelService.parseMetricsFile(buffer);
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation errors found', 
        details: errors 
      }, { status: 400 });
    }
    
    // Process valid data
    const results = await Promise.allSettled(
      data.map(async (row) => {
        // Find agent by employee ID
        const agent = await prisma.agent.findFirst({
          where: { employeeId: row.employeeId }
        });
        
        if (!agent) {
          throw new Error(`Agent with employee ID ${row.employeeId} not found`);
        }
        
        // Calculate scores
        const weights = await prisma.metricWeight.findFirst({
          where: { isDefault: true }
        }) || {
          serviceWeight: 1,
          productivityWeight: 1,
          qualityWeight: 1,
          assiduityWeight: 1,
          performanceWeight: 1,
          adherenceWeight: 1,
          latenessWeight: 1,
          breakExceedsWeight: 1,
        };
        
        const totalScore = 
          row.service * weights.serviceWeight +
          row.productivity * weights.productivityWeight +
          row.quality * weights.qualityWeight +
          row.assiduity * weights.assiduityWeight +
          row.performance * weights.performanceWeight +
          row.adherence * weights.adherenceWeight +
          row.lateness * weights.latenessWeight +
          row.breakExceeds * weights.breakExceedsWeight;
        
        const maxScore = 5 * Object.values(weights).reduce((a, b) => a + b, 0);
        const percentage = (totalScore / maxScore) * 100;
        
        // Upsert metric
        return await prisma.agentMetric.upsert({
          where: {
            agentId_month_year: {
              agentId: agent.userId,
              month: row.month,
              year: row.year
            }
          },
          update: {
            ...row,
            totalScore,
            percentage,
            updatedAt: new Date()
          },
          create: {
            agentId: agent.userId,
            ...row,
            totalScore,
            percentage
          }
        });
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return NextResponse.json({
      message: `Import completed. ${successful} records imported, ${failed} failed.`,
      details: results.map((r, i) => ({
        row: i + 2,
        status: r.status,
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import metrics' },
      { status: 500 }
    );
  }
}
```

## 3. WebSocket Implementation

### Step 1: Install Dependencies
```bash
npm install socket.io socket.io-client @types/socket.io
```

### Step 2: Create Socket Server
```typescript
// src/lib/socket.server.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { getSession } from '@/lib/auth-server';

export class WebSocketService {
  private io: SocketServer;
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        credentials: true
      }
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }
  
  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const session = await getSession(socket.handshake.auth.token);
        if (!session) {
          return next(new Error('Unauthorized'));
        }
        socket.data.user = session.user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }
  
  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.email} connected`);
      
      // Join user to their role-based room
      socket.join(`role:${user.role}`);
      socket.join(`user:${user.id}`);
      
      // Handle dashboard subscription
      socket.on('subscribe:dashboard', () => {
        socket.join('dashboard:updates');
      });
      
      // Handle session updates
      socket.on('session:update', async (data) => {
        // Broadcast to relevant users
        this.io.to(`user:${data.agentId}`).emit('session:updated', data);
        this.io.to(`user:${data.teamLeaderId}`).emit('session:updated', data);
      });
      
      // Handle metric updates
      socket.on('metrics:update', async (data) => {
        // Broadcast to dashboard subscribers
        this.io.to('dashboard:updates').emit('metrics:updated', data);
      });
      
      socket.on('disconnect', () => {
        console.log(`User ${user.email} disconnected`);
      });
    });
  }
  
  // Utility methods for server-side events
  notifyUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  notifyRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
  }
  
  broadcastDashboardUpdate(data: any) {
    this.io.to('dashboard:updates').emit('dashboard:refresh', data);
  }
}
```

### Step 3: Create Socket Hook
```typescript
// src/hooks/use-socket.tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (!session?.user) return;
    
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      auth: {
        token: session.user.id
      }
    });
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });
    
    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, [session]);
  
  return { socket, isConnected };
}
```

## 4. Quick Notes Implementation

### Step 1: Create API Routes
```typescript
// src/app/api/agents/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QuickNoteSchema = z.object({
  content: z.string().min(1).max(1000),
  category: z.enum(['PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'OTHER']),
  isPrivate: z.boolean().optional().default(false)
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const notes = await prisma.quickNote.findMany({
      where: {
        agentId: id,
        OR: [
          { isPrivate: false },
          { authorId: session.user.id }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validated = QuickNoteSchema.parse(body);
    
    const note = await prisma.quickNote.create({
      data: {
        agentId: id,
        authorId: session.user.id,
        ...validated
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    // Emit WebSocket event
    // socketService.notifyUser(id, 'note:created', note);
    
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
```

## 5. Performance Optimizations

### Step 1: Add Redis Caching
```typescript
// src/lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  }
  
  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Step 2: Implement Query Optimization
```typescript
// src/lib/database.optimizations.ts
import { Prisma } from '@prisma/client';

export const agentWithMetricsInclude = Prisma.validator<Prisma.UserInclude>()({
  agentProfile: true,
  agentMetrics: {
    orderBy: { createdAt: 'desc' },
    take: 6
  },
  _count: {
    select: {
      sessionsAsAgent: true,
      agentActionItems: {
        where: { status: 'PENDING' }
      }
    }
  }
});

export const sessionWithDetailsInclude = Prisma.validator<Prisma.CoachingSessionInclude>()({
  agent: {
    select: {
      id: true,
      name: true,
      email: true,
      agentProfile: {
        select: {
          employeeId: true,
          department: true
        }
      }
    }
  },
  teamLeader: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  sessionMetrics: true
});
```

## 6. Testing Implementation

### Step 1: Setup Testing Framework
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

### Step 2: Create Test Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Step 3: Example Test
```typescript
// src/__tests__/api/agents.test.ts
import { GET } from '@/app/api/agents/route';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-server';

jest.mock('@/lib/auth-server');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn()
    }
  }
}));

describe('/api/agents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return agents for authorized team leader', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      user: { id: '1', role: 'TEAM_LEADER' }
    });
    
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: '2', name: 'Agent 1', role: 'AGENT' }
    ]);
    
    const response = await GET(new Request('http://localhost:3000/api/agents'));
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Agent 1');
  });
  
  it('should return 401 for unauthenticated requests', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    
    const response = await GET(new Request('http://localhost:3000/api/agents'));
    
    expect(response.status).toBe(401);
  });
});
```

## Deployment Checklist

1. **Environment Variables**
   - [ ] DATABASE_URL (PostgreSQL)
   - [ ] NEXTAUTH_URL
   - [ ] NEXTAUTH_SECRET
   - [ ] REDIS_URL
   - [ ] SOCKET_URL

2. **Database Setup**
   - [ ] Create PostgreSQL database
   - [ ] Run migrations
   - [ ] Seed initial data
   - [ ] Set up backups

3. **Infrastructure**
   - [ ] Configure Redis
   - [ ] Set up WebSocket server
   - [ ] Configure CDN
   - [ ] Set up monitoring

4. **Security**
   - [ ] Enable HTTPS
   - [ ] Configure firewall
   - [ ] Set up rate limiting
   - [ ] Enable audit logging

5. **Performance**
   - [ ] Enable caching
   - [ ] Configure auto-scaling
   - [ ] Set up load balancer
   - [ ] Enable compression

This implementation guide provides the technical foundation for upgrading the Coach App to v2 specifications. Follow each section sequentially for best results.