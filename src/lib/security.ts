/**
 * Security utilities for input validation and sanitization
 */

import { z } from 'zod';

import logger from '@/lib/logger';

// Input sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .slice(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeNumber(input: string | number, min = 0, max = 100): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(num)) {return min;}
  return Math.min(max, Math.max(min, num));
}

// Validation schemas
export const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  role: z.enum(['ADMIN', 'MANAGER', 'TEAM_LEADER', 'AGENT']),
  isActive: z.boolean().optional().default(true),
  password: z.string().min(8).max(128).optional(),
});

export const agentMetricSchema = z.object({
  agentId: z.string().cuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2030),
  service: z.number().int().min(0).max(100),
  productivity: z.number().int().min(0).max(100),
  quality: z.number().int().min(0).max(100),
  assiduity: z.number().int().min(0).max(100),
  performance: z.number().int().min(0).max(100),
  adherence: z.number().int().min(0).max(100),
  lateness: z.number().int().min(0).max(100),
  breakExceeds: z.number().int().min(0).max(100),
});

export const sessionSchema = z.object({
  agentId: z.string().cuid(),
  teamLeaderId: z.string().cuid(),
  scheduledDate: z.string().datetime(),
  duration: z.number().int().min(15).max(240).optional().default(60),
  preparationNotes: z.string().max(5000).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().default('SCHEDULED'),
});

// Rate limiting utility
class RateLimiter {
  private requests = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    // Cleanup old entries
    if (this.requests.size > 1000) {
      this.cleanup();
    }
    
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// CORS headers for API responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env['NODE_ENV'] === 'production' 
    ? process.env['NEXTAUTH_URL'] || 'https://your-domain.com'
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Security headers
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
};

// Error logging (remove logger.info in production)
export function logError(error: unknown, context?: string): void {
  if (process.env['NODE_ENV'] === 'development') {
    logger.error(`[${context || 'ERROR'}]:`, error as Error);
  }
  // In production, send to logging service
  // await logToService(error, context);
}

// Safe JSON parsing
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
