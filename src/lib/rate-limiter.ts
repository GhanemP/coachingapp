import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimiterMemory,
  RateLimiterRedis,
  IRateLimiterOptions,
  RateLimiterRes,
} from 'rate-limiter-flexible';

import logger from '@/lib/logger';
import redis from '@/lib/redis';

// Rate limiter configurations
const authRateLimiterOptions: IRateLimiterOptions = {
  points: 5, // 5 attempts
  duration: 900, // per 15 minutes
  blockDuration: 900, // block for 15 minutes
  keyPrefix: 'auth_fail',
};

const apiRateLimiterOptions: IRateLimiterOptions = {
  points: 100, // 100 requests
  duration: 60, // per minute
  keyPrefix: 'api',
};

const strictApiRateLimiterOptions: IRateLimiterOptions = {
  points: 10, // 10 requests
  duration: 60, // per minute
  keyPrefix: 'strict_api',
};

// Account lockout tracking
const lockoutMap = new Map<string, { attempts: number; lockedUntil?: Date }>();

// Create rate limiters (use Redis if available, fallback to memory)
let authRateLimiter: RateLimiterMemory | RateLimiterRedis;
let apiRateLimiter: RateLimiterMemory | RateLimiterRedis;
let strictApiRateLimiter: RateLimiterMemory | RateLimiterRedis;

// Initialize rate limiters
function initRateLimiters() {
  if (redis) {
    try {
      authRateLimiter = new RateLimiterRedis({
        storeClient: redis,
        ...authRateLimiterOptions,
      });

      apiRateLimiter = new RateLimiterRedis({
        storeClient: redis,
        ...apiRateLimiterOptions,
      });

      strictApiRateLimiter = new RateLimiterRedis({
        storeClient: redis,
        ...strictApiRateLimiterOptions,
      });

      logger.info('Rate limiters initialized with Redis');
    } catch (error) {
      logger.error(
        'Failed to initialize Redis rate limiters, falling back to memory',
        error as Error
      );
      initMemoryRateLimiters();
    }
  } else {
    initMemoryRateLimiters();
  }
}

function initMemoryRateLimiters() {
  authRateLimiter = new RateLimiterMemory(authRateLimiterOptions);
  apiRateLimiter = new RateLimiterMemory(apiRateLimiterOptions);
  strictApiRateLimiter = new RateLimiterMemory(strictApiRateLimiterOptions);
  logger.info('Rate limiters initialized with memory storage');
}

// Initialize on module load
initRateLimiters();

// Helper to get client IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

// Authentication rate limiting
export async function checkAuthRateLimit(email: string, ip: string): Promise<boolean> {
  if (!authRateLimiter) {
    await initRateLimiters();
  }

  try {
    const key = `${email}_${ip}`;
    await authRateLimiter.consume(key);
    return true;
  } catch {
    logger.warn('Auth rate limit exceeded', { email, ip });
    return false;
  }
}

// API rate limiting middleware
export async function checkApiRateLimit(
  request: NextRequest,
  strict: boolean = false
): Promise<{ allowed: boolean; response?: NextResponse }> {
  if (!apiRateLimiter || !strictApiRateLimiter) {
    await initRateLimiters();
  }

  const ip = getClientIp(request);
  const limiter = strict ? strictApiRateLimiter : apiRateLimiter;

  try {
    await limiter.consume(ip);
    return { allowed: true };
  } catch (error) {
    const rateLimiterRes = error as RateLimiterRes;
    const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 60;

    logger.warn('API rate limit exceeded', {
      ip,
      strict,
      remainingPoints: rateLimiterRes.remainingPoints,
      msBeforeNext: rateLimiterRes.msBeforeNext,
    });

    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limiter.points),
          'X-RateLimit-Remaining': String(rateLimiterRes.remainingPoints || 0),
          'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
        },
      }
    );

    return { allowed: false, response };
  }
}

// Account lockout functions
export function checkAccountLockout(email: string): boolean {
  const lockout = lockoutMap.get(email);
  if (!lockout) {
    return false;
  }

  if (lockout.lockedUntil && lockout.lockedUntil > new Date()) {
    logger.warn('Account locked out', { email, lockedUntil: lockout.lockedUntil });
    return true;
  }

  // Lockout expired, remove it
  if (lockout.lockedUntil && lockout.lockedUntil <= new Date()) {
    lockoutMap.delete(email);
  }

  return false;
}

export function recordFailedAttempt(email: string): void {
  const lockout = lockoutMap.get(email) || { attempts: 0 };
  lockout.attempts += 1;

  // Lock account after 5 failed attempts
  if (lockout.attempts >= 5) {
    lockout.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    logger.warn('Account locked due to failed attempts', {
      email,
      attempts: lockout.attempts,
      lockedUntil: lockout.lockedUntil,
    });
  }

  lockoutMap.set(email, lockout);
}

export function clearFailedAttempts(email: string): void {
  lockoutMap.delete(email);
  logger.info('Failed attempts cleared', { email });
}

// Reset rate limit for a specific key (useful for testing or admin actions)
export async function resetRateLimit(
  key: string,
  type: 'auth' | 'api' | 'strict' = 'api'
): Promise<void> {
  try {
    let limiter: RateLimiterMemory | RateLimiterRedis;

    switch (type) {
      case 'auth':
        limiter = authRateLimiter;
        break;
      case 'strict':
        limiter = strictApiRateLimiter;
        break;
      default:
        limiter = apiRateLimiter;
    }

    await limiter.delete(key);
    logger.info('Rate limit reset', { key, type });
  } catch (error) {
    logger.error('Failed to reset rate limit', error as Error, { key, type });
  }
}

// Middleware function for API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: { strict?: boolean }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const { allowed, response } = await checkApiRateLimit(req, options?.strict);

    if (!allowed && response) {
      return response;
    }

    return handler(req);
  };
}
