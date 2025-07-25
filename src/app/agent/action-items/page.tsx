import { Metadata } from 'next';
import { ActionItemsList } from '@/components/action-items/action-items-list';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'My Action Items | Agent Dashboard',
  description: 'View and manage your action items',
};

export default async function AgentActionItemsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'AGENT') {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Action Items</h1>
        <p className="text-gray-600 mt-2">
          Track and complete your assigned action items
        </p>
      </div>
      
      <ActionItemsList 
        agentId={session.user.id} 
        showCreateButton={false} 
      />
    </div>
  );
}