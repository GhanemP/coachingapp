"use client";

import { Navigation } from "@/components/navigation";
import { ClientWrapper } from "@/app/client-wrapper";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ClientWrapper>
      <Navigation />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </ClientWrapper>
  );
}