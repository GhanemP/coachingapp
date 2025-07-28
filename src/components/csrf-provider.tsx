'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { generateCSRFToken } from '@/lib/security/auth-security';

interface CSRFContextType {
  csrfToken: string | null;
  refreshToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType>({
  csrfToken: null,
  refreshToken: async () => {},
});

export function CSRFProvider({ children }: { children: ReactNode }) {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = async () => {
    try {
      // In a real implementation, this would fetch from an API endpoint
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCSRFToken(data.csrfToken);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      // Generate a client-side token as fallback
      const sessionId =
        document.cookie
          .split('; ')
          .find(row => row.startsWith('next-auth.session-token='))
          ?.split('=')[1] || 'anonymous';

      setCSRFToken(generateCSRFToken(sessionId));
    }
  };

  useEffect(() => {
    // Initial token fetch
    refreshToken().finally(() => setIsLoading(false));

    // Refresh token periodically (every 30 minutes)
    const interval = setInterval(refreshToken, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Add CSRF token to all fetch requests
  useEffect(() => {
    if (!csrfToken) {
      return;
    }

    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      // Helper function to get URL from input
      function getUrlFromInput(input: RequestInfo | URL): string {
        if (typeof input === 'string') {
          return input;
        }
        if (input instanceof Request) {
          return input.url;
        }
        return input.toString();
      }

      // Only add CSRF token to same-origin requests
      const url = getUrlFromInput(input);
      const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);

      if (
        isSameOrigin &&
        init?.method &&
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(init.method)
      ) {
        init.headers = {
          ...init.headers,
          'x-csrf-token': csrfToken,
        };
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [csrfToken]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <CSRFContext.Provider value={{ csrfToken, refreshToken }}>{children}</CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
}
