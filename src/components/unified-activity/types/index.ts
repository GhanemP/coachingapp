export interface QuickNote {
  id: string;
  content: string;
  category: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  agent: {
    id: string;
    name: string | null;
    email: string;
  };
  author: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export interface Session {
  id: string;
  scheduledDate: string;
  sessionDate: string;
  status: string;
  duration: number;
  preparationNotes?: string;
  sessionNotes?: string;
  agent: {
    id: string;
    name: string | null;
    email: string;
  };
  teamLeader: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface Agent {
  id: string;
  name: string | null;
  email: string;
}

export type ActivityItem = {
  id: string;
  type: 'note' | 'session';
  title: string;
  description?: string;
  date: Date;
  status?: string;
  category?: string;
  agent: {
    id: string;
    name: string | null;
    email: string;
  };
  author?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  isPrivate?: boolean;
  duration?: number;
  rawData: QuickNote | Session;
};

export interface UnifiedActivityViewProps {
  showCreateButton?: boolean;
  limit?: number;
  itemsPerPage?: number;
}

export type ViewMode = 'table' | 'kanban';
export type TypeFilter = 'all' | 'notes' | 'sessions';
export type DateRange = 'all' | 'today' | 'week' | 'month';

export interface ActivityFilters {
  searchTerm: string;
  typeFilter: TypeFilter;
  categoryFilter: string;
  statusFilter: string;
  dateRange: DateRange;
  agentFilter: string;
}

export interface PaginationState {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ColumnConfig {
  key: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}
