import { RateLimiterMemory } from 'rate-limiter-flexible';
import { z } from 'zod';

// Enhanced rate limiter with IP-based tracking
export const authRateLimiter = new RateLimiterMemory({
  points: 200, // 200 attempts (increased for NextAuth session checks)
  duration: 60, // per 1 minute
  blockDuration: 60, // block for 1 minute
});

// Account lockout with persistent storage
interface LockoutInfo {
  attempts: number;
  lockedUntil?: Date;
  lastAttempt: Date;
  ipAddresses: Set<string>;
}

const lockoutMap = new Map<string, LockoutInfo>();

// CSRF token management with expiration
interface CSRFToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

const csrfTokens = new Map<string, CSRFToken>();

export async function checkAccountLockout(email: string, _ipAddress: string): Promise<{
  isLocked: boolean;
  remainingTime?: number;
  reason?: string;
}> {
  const lockout = lockoutMap.get(email);
  if (!lockout) return { isLocked: false };
  
  // Check if account is locked
  if (lockout.lockedUntil && lockout.lockedUntil > new Date()) {
    const remainingTime = lockout.lockedUntil.getTime() - Date.now();
    return { 
      isLocked: true, 
      remainingTime,
      reason: `Account locked due to ${lockout.attempts} failed attempts`
    };
  }
  
  // Check for suspicious activity (multiple IPs)
  if (lockout.ipAddresses.size > 3) {
    return {
      isLocked: true,
      reason: 'Suspicious activity detected from multiple locations'
    };
  }
  
  return { isLocked: false };
}

export async function recordFailedAttempt(
  email: string, 
  ipAddress: string
): Promise<void> {
  const lockout = lockoutMap.get(email) || {
    attempts: 0,
    lastAttempt: new Date(),
    ipAddresses: new Set<string>()
  };
  
  lockout.attempts += 1;
  lockout.lastAttempt = new Date();
  lockout.ipAddresses.add(ipAddress);
  
  // Progressive lockout durations
  const lockoutDurations = [5, 15, 30, 60, 120]; // minutes
  const lockoutIndex = Math.min(lockout.attempts - 5, lockoutDurations.length - 1);
  
  if (lockout.attempts >= 5) {
    const duration = lockoutDurations[lockoutIndex] * 60 * 1000;
    lockout.lockedUntil = new Date(Date.now() + duration);
  }
  
  lockoutMap.set(email, lockout);
}

export async function clearFailedAttempts(email: string): Promise<void> {
  lockoutMap.delete(email);
}

// Enhanced CSRF protection
export function generateCSRFToken(sessionId: string): string {
  // Perform cleanup if needed
  performCleanupIfNeeded();
  
  // Use Web Crypto API for Edge Runtime compatibility
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  const csrfToken: CSRFToken = {
    token,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  };
  
  csrfTokens.set(sessionId, csrfToken);
  return token;
}

export function validateCSRFToken(
  sessionId: string, 
  token: string
): { valid: boolean; error?: string } {
  const storedToken = csrfTokens.get(sessionId);
  
  if (!storedToken) {
    return { valid: false, error: 'CSRF token not found' };
  }
  
  if (storedToken.expiresAt < new Date()) {
    csrfTokens.delete(sessionId);
    return { valid: false, error: 'CSRF token expired' };
  }
  
  // Simple string comparison for Edge Runtime
  const valid = token === storedToken.token;
  
  if (valid) {
    // Rotate token after successful validation
    csrfTokens.delete(sessionId);
  }
  
  return { valid };
}

// Password strength validation
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine((password) => {
    // Check for common patterns
    const commonPatterns = ['password', '12345', 'qwerty', 'admin'];
    return !commonPatterns.some(pattern => 
      password.toLowerCase().includes(pattern)
    );
  }, 'Password contains common patterns');

// Session validation with device fingerprinting
export interface SessionFingerprint {
  userAgent: string;
  ipAddress: string;
  acceptLanguage: string;
  acceptEncoding: string;
}

export function generateSessionFingerprint(headers: Headers): string {
  const fingerprint: SessionFingerprint = {
    userAgent: headers.get('user-agent') || '',
    ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || '',
    acceptLanguage: headers.get('accept-language') || '',
    acceptEncoding: headers.get('accept-encoding') || ''
  };
  
  const data = JSON.stringify(fingerprint);
  
  // Simple hash function for Edge Runtime
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

// Manual cleanup function for expired tokens (Edge Runtime compatible)
export function cleanupExpiredTokens(): void {
  const now = new Date();
  
  // Clean expired CSRF tokens
  for (const [sessionId, token] of csrfTokens.entries()) {
    if (token.expiresAt < now) {
      csrfTokens.delete(sessionId);
    }
  }
  
  // Clean old lockout entries
  for (const [email, lockout] of lockoutMap.entries()) {
    if (lockout.lockedUntil && lockout.lockedUntil < now &&
        lockout.lastAttempt < new Date(now.getTime() - 86400000)) { // 24 hours
      lockoutMap.delete(email);
    }
  }
}

// Call cleanup during token operations to maintain cleanliness
function performCleanupIfNeeded(): void {
  // Simple cleanup trigger - run cleanup every 100 operations
  const global = globalThis as typeof globalThis & { __cleanupCounter?: number };
  const cleanupCounter = global.__cleanupCounter || 0;
  if (cleanupCounter % 100 === 0) {
    cleanupExpiredTokens();
  }
  global.__cleanupCounter = cleanupCounter + 1;
}