# Coach App v2 Technical Recommendations

## Priority 1: Critical Database Migration

### Issue: SQLite to PostgreSQL Migration

**Current State:** The application uses SQLite which is inadequate for production use with multiple concurrent users.

**Required Changes:**

1. **Update Dependencies**
```bash
npm install @prisma/client prisma
npm install --save-dev @types/node
```

2. **Environment Configuration**
```env
# .env (production)
DATABASE_URL="postgresql://postgres:password@localhost:5432/coaching_app"
SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/coaching_app_shadow"
```

3. **Prisma Schema Updates**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  extensions = [pgcrypto, uuid-ossp]
}

// Add PostgreSQL-specific optimizations
model User {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // ... rest of the model
  
  @@index([email])
  @@index([role])
  @@index([teamLeaderId])
}

model QuickNote {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // ... rest of the model
  
  @@index([agentId, createdAt(sort: Desc)])
  @@index([category, isPrivate])
}
```

4. **Migration Script**
```typescript
// scripts/migrate-to-postgres.ts
import { PrismaClient as SqliteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client';

const sqliteDb = new SqliteClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

const postgresDb = new PostgresClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function migrate() {
  console.log('Starting migration from SQLite to PostgreSQL...');
  
  // Migrate users first (no dependencies)
  const users = await sqliteDb.user.findMany();
  for (const user of users) {
    await postgresDb.user.create({ data: user });
  }
  
  // Migrate dependent tables in order
  // ... (implement full migration logic)
  
  console.log('Migration completed successfully!');
}

migrate()
  .catch(console.error)
  .finally(() => {
    sqliteDb.$disconnect();
    postgresDb.$disconnect();
  });
```

## Priority 2: WebSocket Integration Fix

### Issue: Socket.io server not properly integrated with Next.js

**Required Changes:**

1. **Create Custom Server**
```javascript
// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initializeSocketServer } = require('./src/lib/socket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = initializeSocketServer(server);
  
  // Store io instance for use in API routes
  global.io = io;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server initialized');
  });
});
```

2. **Update package.json Scripts**
```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

3. **Fix Socket Helper Functions**
```typescript
// src/lib/socket-helpers.ts
import { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;
}

export async function notifyQuickNoteCreated(quickNote: {
  id: string;
  agentId: string;
  createdBy: {
    name: string | null;
  };
}) {
  if (!global.io) {
    console.warn('Socket.io server not initialized');
    return;
  }

  try {
    // Emit to specific agent room
    global.io.to(`agent:${quickNote.agentId}`).emit('quick-note-created', quickNote);
    
    // Also emit to user's personal room
    global.io.to(`user:${quickNote.agentId}`).emit('notification', {
      type: 'QUICK_NOTE',
      title: 'New Quick Note',
      message: `A new quick note has been added by ${quickNote.createdBy.name}`,
      data: quickNote
    });
  } catch (error) {
    console.error('Error notifying quick note created:', error);
  }
}
```

## Priority 3: AI Features Implementation

### Issue: Missing AI-powered features for v2

**Implementation Plan:**

1. **Install AI Dependencies**
```bash
npm install openai langchain @pinecone-database/pinecone
```

2. **Create AI Service**
```typescript
// src/lib/ai-service.ts
import { OpenAI } from 'openai';
import { PineconeClient } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new PineconeClient();

export class AIService {
  async initializeVectorStore() {
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });
  }

  async generateCoachingRecommendations(agentId: string, metrics: any) {
    const prompt = `
      Based on the following agent performance metrics, provide specific coaching recommendations:
      ${JSON.stringify(metrics, null, 2)}
      
      Provide 3-5 actionable recommendations focusing on:
      1. Areas of improvement
      2. Specific training suggestions
      3. Goal setting recommendations
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert performance coach specializing in call center agent development."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content;
  }

  async predictPerformanceTrends(agentId: string, historicalData: any[]) {
    // Implement performance prediction using historical data
    // Can use time series analysis or ML models
  }

  async analyzeSessionTranscript(transcript: string) {
    // Analyze coaching session transcripts for insights
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Analyze this coaching session transcript and identify key themes, action items, and follow-up recommendations."
        },
        {
          role: "user",
          content: transcript
        }
      ]
    });

    return completion.choices[0].message.content;
  }
}

export const aiService = new AIService();
```

3. **Create AI API Endpoints**
```typescript
// src/app/api/ai/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await request.json();

    // Get agent's recent metrics
    const metrics = await prisma.agentMetric.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const recommendations = await aiService.generateCoachingRecommendations(
      agentId,
      metrics
    );

    // Store recommendations
    await prisma.aiRecommendation.create({
      data: {
        agentId,
        type: 'COACHING',
        content: recommendations,
        generatedBy: session.user.id,
        metadata: { metrics: metrics.map(m => m.id) }
      }
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
```

## Priority 4: Testing Framework Setup

### Issue: No testing infrastructure

**Implementation:**

1. **Install Testing Dependencies**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @types/jest jest-environment-jsdom
npm install --save-dev supertest @types/supertest
```

2. **Jest Configuration**
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

module.exports = createJestConfig(customJestConfig)
```

3. **Example API Route Test**
```typescript
// src/app/api/quick-notes/__tests__/route.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    quickNote: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('/api/quick-notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      
      const { req, res } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('should return quick notes for authenticated user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'AGENT' }
      });

      const mockNotes = [
        { id: '1', content: 'Test note', agentId: 'user1' }
      ];

      (prisma.quickNote.findMany as jest.Mock).mockResolvedValue(mockNotes);
      (prisma.quickNote.count as jest.Mock).mockResolvedValue(1);

      const { req } = createMocks({
        method: 'GET',
        url: '/api/quick-notes?page=1&limit=20',
      });

      const response = await GET(req as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.quickNotes).toEqual(mockNotes);
      expect(json.pagination.total).toBe(1);
    });
  });
});
```

## Priority 5: Performance Optimizations

### Database Query Optimizations

1. **Add Database Indexes**
```prisma
// prisma/schema.prisma
model QuickNote {
  // ... existing fields
  
  @@index([agentId, createdAt(sort: Desc)])
  @@index([category, isPrivate])
  @@index([authorId])
}

model ActionItem {
  // ... existing fields
  
  @@index([agentId, status, dueDate])
  @@index([assignedTo, status])
  @@index([sessionId])
}

model CoachingSession {
  // ... existing fields
  
  @@index([agentId, status, scheduledDate])
  @@index([teamLeaderId, status])
  @@index([sessionDate])
}
```

2. **Implement Query Result Caching**
```typescript
// src/lib/cache-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/redis';
import crypto from 'crypto';

export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  ttl: number = 300
) {
  return async (req: NextRequest) => {
    // Generate cache key from URL and user
    const url = req.url;
    const userId = req.headers.get('x-user-id') || 'anonymous';
    const cacheKey = crypto
      .createHash('md5')
      .update(`${url}-${userId}`)
      .digest('hex');

    // Try to get from cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' }
      });
    }

    // Execute handler
    const response = await handler(req);
    const data = await response.json();

    // Cache successful responses
    if (response.status === 200) {
      await setCache(cacheKey, data, ttl);
    }

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' }
    });
  };
}
```

## Implementation Timeline

### Week 1: Foundation
- Day 1-2: PostgreSQL migration
- Day 3-4: WebSocket integration
- Day 5: Testing framework setup

### Week 2: Features
- Day 1-3: AI service implementation
- Day 4-5: Performance optimizations

### Week 3: Testing & Deployment
- Day 1-3: Write comprehensive tests
- Day 4-5: Production deployment prep

## Monitoring & Observability

1. **Add Application Monitoring**
```bash
npm install @sentry/nextjs pino pino-pretty
```

2. **Configure Sentry**
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

3. **Add Structured Logging**
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
```

## Security Enhancements

1. **Add Rate Limiting**
```typescript
// src/lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 60 * 1000, // 1 minute
});

export async function rateLimit(
  identifier: string,
  limit: number = 10
): Promise<{ success: boolean; remaining: number }> {
  const count = rateLimitCache.get(identifier) || 0;
  
  if (count >= limit) {
    return { success: false, remaining: 0 };
  }
  
  rateLimitCache.set(identifier, count + 1);
  return { success: true, remaining: limit - count - 1 };
}
```

2. **Add Input Validation Middleware**
```typescript
// src/lib/validation-middleware.ts
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (
    handler: (req: NextRequest, body: T) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest) => {
      try {
        const body = await req.json();
        const validated = schema.parse(body);
        return handler(req, validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Validation failed', details: error.issues },
            { status: 400 }
          );
        }
        throw error;
      }
    };
  };
}
```

---

*Technical Recommendations Document*
*Version: 1.0*
*Date: 2025-01-24*