import { NextRequest } from 'next/server';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a secure CSRF token using Web Crypto API (Edge-compatible)
export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate CSRF token from request (Edge-compatible version)
export function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF validation for GET requests
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return Promise.resolve(true);
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    console.warn('CSRF validation failed: No token in cookie');
    return Promise.resolve(false);
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // For Edge Runtime, we'll only check header token (body parsing is limited)
  const requestToken = headerToken;

  if (!requestToken) {
    console.warn('CSRF validation failed: No token in request header');
    return Promise.resolve(false);
  }

  // Compare tokens using simple string comparison
  // Note: In Edge Runtime, we don't have access to crypto.timingSafeEqual
  const isValid = cookieToken === requestToken;

  if (!isValid) {
    console.warn('CSRF validation failed: Token mismatch');
  }

  return Promise.resolve(isValid);
}
