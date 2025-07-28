'use client';

import { SessionProvider } from 'next-auth/react';

import { ErrorBoundary } from '@/components/error-boundary';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider basePath="/api/auth">{children}</SessionProvider>
    </ErrorBoundary>
  );
}
