'use client';

import { QuickNotesList } from '@/components/quick-notes/quick-notes-list';
import { PageHeader } from '@/components/page-header';

export default function ManagerQuickNotesPage() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Quick Notes"
        description="View and manage quick notes for all agents"
      />
      <div className="mt-6">
        <QuickNotesList />
      </div>
    </div>
  );
}