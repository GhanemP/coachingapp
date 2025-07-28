"use client";
import { useEffect, useState } from 'react';

import { getCSRFTokenForClient } from '@/lib/csrf-client';

export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);

  useEffect(() => {
    // Get CSRF token on mount
    const token = getCSRFTokenForClient();
    setCSRFToken(token);
  }, []);

  // Helper function to add CSRF token to fetch requests
  const fetchWithCSRF = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // Helper function to add CSRF token to form data
  const addCSRFToFormData = (formData: FormData): FormData => {
    if (csrfToken) {
      formData.append('_csrf', csrfToken);
    }
    return formData;
  };

  // Helper function to add CSRF token to JSON body
  const addCSRFToBody = <T extends Record<string, unknown>>(body: T): T & { _csrf?: string } => {
    if (csrfToken && typeof body === 'object' && body !== null) {
      return { ...body, _csrf: csrfToken };
    }
    return body;
  };

  return {
    csrfToken,
    fetchWithCSRF,
    addCSRFToFormData,
    addCSRFToBody,
  };
}

// Global fetch wrapper that automatically includes CSRF token
export function setupCSRFInterceptor() {
  if (typeof window === 'undefined') {return;}

  const originalFetch = window.fetch;

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Only add CSRF token to same-origin requests
    const url = typeof input === 'string' ? input : input.toString();
    const isApiRequest = url.startsWith('/api/') || url.includes(window.location.origin);
    
    if (isApiRequest && init?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(init.method)) {
      const csrfToken = getCSRFTokenForClient();
      
      if (csrfToken) {
        const headers = new Headers(init.headers);
        headers.set('x-csrf-token', csrfToken);
        
        return originalFetch(input, {
          ...init,
          headers,
        });
      }
    }

    return originalFetch(input, init);
  };
}