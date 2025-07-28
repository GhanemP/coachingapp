"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

export function AuthErrorHandler({ children }: AuthErrorHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    // Handle NextAuth errors
    const handleAuthError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('CLIENT_FETCH_ERROR') || 
          event.error?.message?.includes('Too many requests')) {
        console.error('Auth error detected:', event.error);
        
        // Clear session storage to prevent loops
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }
        
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/?error=rate_limit');
        }, 2000);
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('CLIENT_FETCH_ERROR') || 
          event.reason?.message?.includes('Too many requests')) {
        console.error('Auth promise rejection:', event.reason);
        event.preventDefault();
        
        // Clear session storage to prevent loops
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }
        
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/?error=rate_limit');
        }, 2000);
      }
    };

    window.addEventListener('error', handleAuthError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleAuthError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [router]);

  return <>{children}</>;
}