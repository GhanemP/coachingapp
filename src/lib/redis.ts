import Redis from 'ioredis';

import logger from '@/lib/logger';

// Track Redis availability
let isRedisAvailable = false;
let redisErrorLogged = false;

// Create Redis client with more resilient configuration
const redis = new Redis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'] || undefined,
  db: parseInt(process.env['REDIS_DB'] || '0'),
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts to reduce noise
    if (times > 3) {
      return null;
    }
    const delay = Math.min(times * 1000, 5000);
    return delay;
  },
  maxRetriesPerRequest: 1, // Reduce from default 20 to 1
  connectTimeout: 5000,
  lazyConnect: true, // Don't auto-connect on instantiation
});

redis.on('error', () => {
  isRedisAvailable = false;
  // Only log the error once to avoid spam
  if (!redisErrorLogged) {
    logger.warn('Redis not available - caching disabled. Install Redis with: brew install redis && brew services start redis');
    redisErrorLogged = true;
  }
});

redis.on('connect', () => {
  isRedisAvailable = true;
  redisErrorLogged = false;
  logger.info('Redis Client Connected - caching enabled');
});

redis.on('ready', () => {
  isRedisAvailable = true;
});

// Cache key prefixes
export const CACHE_KEYS = {
  USER: 'user:',
  SESSION: 'session:',
  AGENT_METRICS: 'agent_metrics:',
  QUICK_NOTES: 'quick_notes:',
  ACTION_ITEMS: 'action_items:',
  ACTION_PLANS: 'action_plans:',
  NOTIFICATIONS: 'notifications:',
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

// Helper functions for caching
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) {
    return null;
  }
  
  try {
    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  } catch {
    // Silently fail and return null if Redis is not available
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> {
  if (!isRedisAvailable) {
    return;
  }
  
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // Silently fail if Redis is not available
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!isRedisAvailable) {
    return;
  }
  
  try {
    await redis.del(key);
  } catch {
    // Silently fail if Redis is not available
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!isRedisAvailable) {
    return;
  }
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Silently fail if Redis is not available
  }
}

// Invalidate related caches
export async function invalidateUserCache(userId: string): Promise<void> {
  await deleteCachePattern(`${CACHE_KEYS.USER}${userId}*`);
}

export async function invalidateAgentCache(agentId: string): Promise<void> {
  await deleteCachePattern(`${CACHE_KEYS.AGENT_METRICS}${agentId}*`);
  await deleteCachePattern(`${CACHE_KEYS.QUICK_NOTES}*${agentId}*`);
  await deleteCachePattern(`${CACHE_KEYS.ACTION_ITEMS}*${agentId}*`);
  await deleteCachePattern(`${CACHE_KEYS.ACTION_PLANS}*${agentId}*`);
}

export default redis;