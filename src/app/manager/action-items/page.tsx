import { Metadata } from 'next';
import { ActionItemsList } from '@/components/action-items/action-items-list';

export const metadata: Metadata = {
  title: 'Action Items | Manager Dashboard',
  description: 'Manage action items across all teams',
};

export default function ManagerActionItemsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Action Items</h1>
        <p className="text-gray-600 mt-2">
          Track and manage action items across all teams
        </p>
      </div>
      
      <ActionItemsList showCreateButton={true} />
    </div>
  );
}