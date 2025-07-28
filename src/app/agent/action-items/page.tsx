'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { ActionItemsList } from '@/components/action-items/action-items-list';

export default function AgentActionItemsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    if (!session || session.user.role !== 'AGENT') {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Action Items</h1>
        <p className="text-gray-600 mt-2">Track and complete your assigned action items</p>
      </div>

      <ActionItemsList agentId={session.user.id} showCreateButton={false} />
    </div>
  );
}
