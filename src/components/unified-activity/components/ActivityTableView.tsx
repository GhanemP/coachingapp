import { format } from 'date-fns';
import { StickyNote, Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ActivityItem } from '../types';
import { getStatusColor, getCategoryColor } from '../utils/styling';

interface ActivityTableViewProps {
  activities: ActivityItem[];
}

export function ActivityTableView({ activities }: ActivityTableViewProps) {
  const router = useRouter();

  const handleRowClick = (item: ActivityItem) => {
    if (item.type === 'note') {
      // Navigate to quick note detail (if exists)
      router.push(`/team-leader/quick-notes`);
    } else {
      // Navigate to session detail
      router.push(`/sessions/${item.id}`);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="max-h-[600px] overflow-y-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="min-w-[300px]">Title</TableHead>
              <TableHead className="min-w-[150px]">Agent</TableHead>
              <TableHead className="min-w-[150px]">Date</TableHead>
              <TableHead className="min-w-[120px]">Status/Category</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map(item => (
              <TableRow
                key={item.id}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  item.type === 'note' ? 'bg-blue-50/30' : 'bg-green-50/30'
                }`}
                onClick={() => handleRowClick(item)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.type === 'note' ? (
                      <StickyNote className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Calendar className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                      {item.type === 'note' ? 'Note' : 'Session'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="truncate">{item.title}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{item.agent.name || item.agent.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{format(item.date, 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {item.type === 'note' && item.category && (
                    <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
                  )}
                  {item.type === 'session' && item.status && (
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  )}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => handleRowClick(item)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
