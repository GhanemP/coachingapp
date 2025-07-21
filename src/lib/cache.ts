/**
 * Simple in-memory cache implementation for development
 * In production, consider using Redis or other external cache solutions
 */

interface CacheItem<T> {
  data: T;
  expires: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  agents: () => 'agents:all',
  agentById: (id: string) => `agent:${id}`,
  agentMetrics: (id: string) => `agent:${id}:metrics`,
  agentScorecard: (id: string) => `agent:${id}:scorecard`,
  users: () => 'users:all',
  usersByRole: (role: string) => `users:role:${role}`,
  sessions: (agentId?: string) => agentId ? `sessions:agent:${agentId}` : 'sessions:all',
} as const;

// Cache wrapper for async functions
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

// Invalidate related cache entries
export function invalidateCache(patterns: string[]): void {
  patterns.forEach(pattern => {
    if (pattern.includes('*')) {
      // Pattern matching for wildcard invalidation
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of cache['cache'].keys()) {
        if (regex.test(key)) {
          cache.delete(key);
        }
      }
    } else {
      cache.delete(pattern);
    }
  });
}

// Auto cleanup interval (runs every 10 minutes)
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}
