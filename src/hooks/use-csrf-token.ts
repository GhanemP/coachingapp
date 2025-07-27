"use client";
import { useState, useEffect, useCallback } from 'react';

export function useCSRFToken() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCSRFToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/csrf');
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      setCSRFToken(data.csrfToken);
      
      return data.csrfToken;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching CSRF token:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch token on mount
  useEffect(() => {
    fetchCSRFToken();
  }, [fetchCSRFToken]);

  // Helper function to make authenticated requests with CSRF token
  const fetchWithCSRF = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Get current token or fetch a new one if needed
    let token = csrfToken;
    
    if (!token) {
      token = await fetchCSRFToken();
    }
    
    if (!token) {
      throw new Error('Unable to obtain CSRF token');
    }

    // Add CSRF token to headers
    const headers = new Headers(options.headers);
    headers.set('x-csrf-token', token);
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    // If we get a 403, it might be because the token expired
    // Try once more with a fresh token
    if (response.status === 403) {
      const freshToken = await fetchCSRFToken();
      
      if (freshToken) {
        headers.set('x-csrf-token', freshToken);
        return fetch(url, {
          ...options,
          headers
        });
      }
    }

    return response;
  }, [csrfToken, fetchCSRFToken]);

  return {
    csrfToken,
    isLoading,
    error,
    fetchCSRFToken,
    fetchWithCSRF
  };
}