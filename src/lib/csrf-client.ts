"use client";
// Client-side CSRF utilities
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Client-side helper to get CSRF token for requests
export function getCSRFTokenForClient(): string | null {
  if (typeof window === 'undefined') {return null;}
  
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  
  // Try to get from cookie (if not httpOnly)
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return value;
    }
  }
  
  return null;
}

// Hook for React components
export function useCSRFToken(): string | null {
  if (typeof window === 'undefined') {return null;}
  return getCSRFTokenForClient();
}

// Export constants for use in other files
export { CSRF_HEADER_NAME };