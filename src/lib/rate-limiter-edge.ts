import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for Edge Runtime
// Note: This is per-worker and will reset on deployment
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiter configurations
const configs = {
  api: {
    points: 100,
    duration: 60 * 1000, // 1 minute in ms
  },
  strict: {
    points: 10,
    duration: 60 * 1000, // 1 minute in ms
  },
  auth: {
    points: 5,
    duration: 15 * 60 * 1000, // 15 minutes in ms
  },
};

// Clean up old entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

// Helper to get client IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

// Check rate limit
export async function checkApiRateLimit(
  request: NextRequest,
  strict: boolean = false
): Promise<{ allowed: boolean; response?: NextResponse }> {
  cleanupOldEntries();
  
  const ip = getClientIp(request);
  const config = strict ? configs.strict : configs.api;
  const key = `${strict ? 'strict_' : ''}api_${ip}`;
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.duration,
    });
    return { allowed: true };
  }
  
  if (entry.count >= config.points) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
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
          'X-RateLimit-Limit': String(config.points),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        },
      }
    );
    
    return { allowed: false, response };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return { allowed: true };
}

// Authentication rate limiting
export async function checkAuthRateLimit(email: string, ip: string): Promise<boolean> {
  cleanupOldEntries();
  
  const config = configs.auth;
  const key = `auth_${email}_${ip}`;
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.duration,
    });
    return true;
  }
  
  if (entry.count >= config.points) {
    // Rate limit exceeded
    return false;
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return true;
}

// Account lockout tracking (simplified for Edge Runtime)
const lockoutStore = new Map<string, number>(); // email -> locked until timestamp

export async function checkAccountLockout(email: string): Promise<boolean> {
  const lockedUntil = lockoutStore.get(email);
  if (!lockedUntil) return false;
  
  const now = Date.now();
  if (lockedUntil > now) {
    return true;
  }
  
  // Lockout expired
  lockoutStore.delete(email);
  return false;
}

export async function recordFailedAttempt(email: string): Promise<void> {
  // For Edge Runtime, we'll use a simpler approach
  // Lock account for 30 minutes after detection
  const now = Date.now();
  const lockedUntil = now + 30 * 60 * 1000; // 30 minutes
  lockoutStore.set(email, lockedUntil);
}

export async function clearFailedAttempts(email: string): Promise<void> {
  lockoutStore.delete(email);
}

// Reset rate limit for a specific key
export async function resetRateLimit(key: string): Promise<void> {
  rateLimitStore.delete(key);
}