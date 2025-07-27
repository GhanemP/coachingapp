import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a secure CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Set CSRF token in cookie
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  return token;
}

// Get CSRF token from cookie
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE_NAME);
  return token?.value || null;
}

// Validate CSRF token from request
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF validation for GET requests
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }
  
  // Get token from cookie
  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    logger.warn('CSRF validation failed: No token in cookie');
    return false;
  }
  
  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const bodyToken = await getTokenFromBody(request);
  
  const requestToken = headerToken || bodyToken;
  
  if (!requestToken) {
    logger.warn('CSRF validation failed: No token in request');
    return false;
  }
  
  // Compare tokens using timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(requestToken)
  );
  
  if (!isValid) {
    logger.warn('CSRF validation failed: Token mismatch');
  }
  
  return isValid;
}

// Helper to extract token from request body
async function getTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    // Clone the request to avoid consuming the body
    const clonedRequest = request.clone();
    const contentType = clonedRequest.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await clonedRequest.json();
      return body._csrf || body.csrfToken || null;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await clonedRequest.formData();
      return formData.get('_csrf')?.toString() || formData.get('csrfToken')?.toString() || null;
    }
  } catch (error) {
    logger.error('Error parsing request body for CSRF token', error);
  }
  
  return null;
}

// Middleware helper for CSRF protection
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const isValid = await validateCSRFToken(req);
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid CSRF token',
          message: 'CSRF validation failed. Please refresh the page and try again.'
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return handler(req);
  };
}