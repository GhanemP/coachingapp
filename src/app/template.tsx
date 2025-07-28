'use client';

import { ClientWrapper } from '@/app/client-wrapper';
import { Navigation } from '@/components/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ClientWrapper>
      <Navigation />
      <main className="min-h-screen" style={{ backgroundColor: '#51B1A8' }}>
        {children}
      </main>
    </ClientWrapper>
  );
}
