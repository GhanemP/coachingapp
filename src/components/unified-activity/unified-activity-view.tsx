'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Search, 
  Filter, 
  Calendar,
  StickyNote,
  LayoutGrid,
  List,
  Clock,
  User,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface QuickNote {
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

interface Session {
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

type ActivityItem = {
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

interface UnifiedActivityViewProps {
  showCreateButton?: boolean;
  limit?: number;
}

export function UnifiedActivityView({ showCreateButton = true, limit }: UnifiedActivityViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'notes' | 'sessions'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  // Fetch agents function wrapped in useCallback
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents?supervised=true');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  // Fetch agents
  useEffect(() => {
    fetchAgents();
  }, [session, fetchAgents]);

  // Fetch activities function wrapped in useCallback to prevent recreating on every render
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch quick notes
      const notesPromise = typeFilter !== 'sessions' ? 
        fetch(`/api/quick-notes?limit=${limit || 100}`).then(res => res.json()) : 
        Promise.resolve({ quickNotes: [] });
      
      // Fetch sessions
      const sessionsPromise = typeFilter !== 'notes' ? 
        fetch('/api/sessions').then(res => res.json()) : 
        Promise.resolve([]);

      const [notesData, sessionsData] = await Promise.all([notesPromise, sessionsPromise]);

      // Transform and combine data
      const transformedNotes: ActivityItem[] = notesData.quickNotes.map((note: QuickNote) => ({
        id: note.id,
        type: 'note' as const,
        title: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
        description: note.content,
        date: new Date(note.createdAt),
        category: note.category,
        agent: note.agent,
        author: note.author,
        isPrivate: note.isPrivate,
        rawData: note
      }));

      const transformedSessions: ActivityItem[] = sessionsData.map((session: Session) => ({
        id: session.id,
        type: 'session' as const,
        title: `Coaching Session with ${session.agent.name || session.agent.email}`,
        description: session.preparationNotes || session.sessionNotes,
        date: new Date(session.scheduledDate),
        status: session.status,
        agent: session.agent,
        duration: session.duration,
        rawData: session
      }));

      let combined = [...transformedNotes, ...transformedSessions];

      // Apply filters
      if (searchTerm) {
        combined = combined.filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.agent.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (categoryFilter !== 'all') {
        combined = combined.filter(item => item.category === categoryFilter);
      }

      if (statusFilter !== 'all') {
        combined = combined.filter(item => item.status === statusFilter);
      }

      if (agentFilter !== 'all') {
        combined = combined.filter(item => item.agent.id === agentFilter);
      }

      // Apply date range filter
      const now = new Date();
      if (dateRange !== 'all') {
        combined = combined.filter(item => {
          const itemDate = item.date;
          switch (dateRange) {
            case 'today':
              return itemDate.toDateString() === now.toDateString();
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return itemDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              return itemDate >= monthAgo;
            default:
              return true;
          }
        });
      }

      // Sort by date (newest first)
      combined.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Apply limit if specified
      if (limit) {
        combined = combined.slice(0, limit);
      }

      setActivities(combined);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, categoryFilter, statusFilter, dateRange, agentFilter, limit]);

  // Fetch data
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PERFORMANCE':
        return 'bg-blue-500';
      case 'BEHAVIOR':
        return 'bg-purple-500';
      case 'TRAINING':
        return 'bg-green-500';
      case 'OTHER':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleRowClick = (item: ActivityItem) => {
    if (item.type === 'note') {
      // Navigate to quick note detail (if exists)
      router.push(`/team-leader/quick-notes`);
    } else {
      // Navigate to session detail
      router.push(`/sessions/${item.id}`);
    }
  };

  const renderTableView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status/Category</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((item) => (
          <TableRow 
            key={item.id} 
            className={`cursor-pointer hover:bg-gray-50 ${
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
                <Badge className={getCategoryColor(item.category)}>
                  {item.category}
                </Badge>
              )}
              {item.type === 'session' && item.status && (
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(item);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderKanbanView = () => {
    // Group activities by status/category
    const groups: Record<string, ActivityItem[]> = {};
    
    // Define columns based on filter type
    const columns = typeFilter === 'notes' 
      ? ['PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'OTHER']
      : typeFilter === 'sessions'
      ? ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
      : ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'OTHER'];

    // Initialize groups
    columns.forEach(col => {
      groups[col] = [];
    });

    // Group activities
    activities.forEach(item => {
      const key = item.type === 'note' ? item.category : item.status;
      if (key && groups[key]) {
        groups[key].push(item);
      }
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => (
          <div key={column} className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{column}</h3>
              <Badge variant="secondary">{groups[column].length}</Badge>
            </div>
            <div className="space-y-2">
              {groups[column].map(item => (
                <Card 
                  key={item.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    item.type === 'note' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
                  }`}
                  onClick={() => handleRowClick(item)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'note' ? (
                          <StickyNote className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Calendar className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-xs font-medium text-gray-500">
                          {item.type === 'note' ? 'Note' : 'Session'}
                        </span>
                      </div>
                      {item.isPrivate && (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2 line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{item.agent.name || item.agent.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(item.date, 'MMM d, h:mm a')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v: string) => setViewMode(v as 'table' | 'kanban')}>
              <TabsList>
                <TabsTrigger value="table">
                  <List className="w-4 h-4 mr-2" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(v: string) => setTypeFilter(v as 'all' | 'notes' | 'sessions')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="notes">Quick Notes</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            {typeFilter !== 'sessions' && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="PERFORMANCE">Performance</SelectItem>
                  <SelectItem value="BEHAVIOR">Behavior</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {typeFilter !== 'notes' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Select value={dateRange} onValueChange={(v: string) => setDateRange(v as 'all' | 'today' | 'week' | 'month')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No activities found
          </div>
        ) : (
          viewMode === 'table' ? renderTableView() : renderKanbanView()
        )}
      </CardContent>
    </Card>
  );
}