import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BookOpen,
  FileText,
  StickyNote,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';


import { ActivityItem, ColumnConfig, TypeFilter } from '../types';
import { kanbanColorClasses, KanbanColor } from '../utils/styling';

interface ActivityKanbanViewProps {
  activities: ActivityItem[];
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  onCategoryFilterChange: (category: string) => void;
  onStatusFilterChange: (status: string) => void;
}

export function ActivityKanbanView({
  activities,
  typeFilter,
  onTypeFilterChange,
  onCategoryFilterChange,
  onStatusFilterChange
}: ActivityKanbanViewProps) {
  const router = useRouter();

  const handleRowClick = (item: ActivityItem) => {
    if (item.type === 'note') {
      router.push(`/team-leader/quick-notes`);
    } else {
      router.push(`/sessions/${item.id}`);
    }
  };

  // Separate sessions and notes
  const sessions = activities.filter(item => item.type === 'session');
  const notes = activities.filter(item => item.type === 'note');
  
  // Group sessions by status
  const sessionGroups: Record<string, ActivityItem[]> = {
    'SCHEDULED': [],
    'IN_PROGRESS': [],
    'COMPLETED': [],
    'CANCELLED': []
  };
  
  // Group notes by category
  const noteGroups: Record<string, ActivityItem[]> = {
    'PERFORMANCE': [],
    'BEHAVIOR': [],
    'TRAINING': [],
    'OTHER': []
  };
  
  // Populate groups
  sessions.forEach(session => {
    if (session.status && sessionGroups[session.status]) {
      sessionGroups[session.status].push(session);
    }
  });
  
  notes.forEach(note => {
    if (note.category && noteGroups[note.category]) {
      noteGroups[note.category].push(note);
    }
  });

  // Column configurations
  const sessionColumns: ColumnConfig[] = [
    { key: 'SCHEDULED', label: 'Scheduled', color: 'blue', icon: Calendar },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'yellow', icon: Clock },
    { key: 'COMPLETED', label: 'Completed', color: 'green', icon: CheckCircle2 },
    { key: 'CANCELLED', label: 'Cancelled', color: 'red', icon: XCircle }
  ];
  
  const noteColumns: ColumnConfig[] = [
    { key: 'PERFORMANCE', label: 'Performance', color: 'blue', icon: TrendingUp },
    { key: 'BEHAVIOR', label: 'Behavior', color: 'purple', icon: User },
    { key: 'TRAINING', label: 'Training', color: 'green', icon: BookOpen },
    { key: 'OTHER', label: 'Other', color: 'gray', icon: FileText }
  ];

  const renderColumn = (column: ColumnConfig, items: ActivityItem[], type: 'session' | 'note') => {
    const IconComponent = column.icon;
    const hasMore = items.length > 4;
    const displayItems = hasMore ? items.slice(0, 4) : items;
    
    return (
      <div
        key={column.key}
        className={`flex flex-col border-2 rounded-lg ${kanbanColorClasses[column.color as KanbanColor]}`}
      >
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconComponent className={`w-5 h-5`} />
              <h3 className="font-semibold text-sm">
                {column.label}
              </h3>
            </div>
            <Badge
              variant="secondary"
              className="bg-white"
            >
              {items.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {displayItems.map(item => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-white"
                onClick={() => handleRowClick(item)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium line-clamp-2 flex-1">{item.title}</p>
                    {item.isPrivate && (
                      <Badge variant="outline" className="text-xs ml-2">Private</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{item.agent.name || item.agent.email}</span>
                    </div>
                    <span>{format(item.date, 'MMM d')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onTypeFilterChange(type === 'session' ? 'sessions' : 'notes');
                  if (type === 'session') {
                    onStatusFilterChange(column.key);
                  } else {
                    onCategoryFilterChange(column.key);
                  }
                }}
              >
                View {items.length - 4} more
              </Button>
            )}
            
            {items.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No {type}s
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Sessions Section */}
      {(typeFilter === 'all' || typeFilter === 'sessions') && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Coaching Sessions</h2>
            <Badge variant="outline" className="ml-2">{sessions.length} total</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sessionColumns.map(column =>
              renderColumn(column, sessionGroups[column.key], 'session')
            )}
          </div>
        </div>
      )}
      
      {/* Notes Section */}
      {(typeFilter === 'all' || typeFilter === 'notes') && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Quick Notes</h2>
            <Badge variant="outline" className="ml-2">{notes.length} total</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {noteColumns.map(column =>
              renderColumn(column, noteGroups[column.key], 'note')
            )}
          </div>
        </div>
      )}
    </div>
  );
}