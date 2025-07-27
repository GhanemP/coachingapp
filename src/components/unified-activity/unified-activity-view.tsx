'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // Unused import
import { Badge } from '@/components/ui/badge';
import logger from '@/lib/logger-client';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Search,
  Calendar,
  StickyNote,
  LayoutGrid,
  List,
  Clock,
  User,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BookOpen,
  FileText
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
  itemsPerPage?: number;
}

export function UnifiedActivityView({ limit, itemsPerPage = 20 }: UnifiedActivityViewProps) {
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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  
  // Add a flag to prevent multiple simultaneous fetches
  const [isFetching, setIsFetching] = useState(false);

  // Fetch agents function wrapped in useCallback
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents?supervised=true');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || data);
      }
    } catch (error) {
      logger.error('Error fetching agents:', error);
    }
  }, []);

  // Fetch agents
  useEffect(() => {
    fetchAgents();
  }, [session, fetchAgents]);

  // Fetch activities function wrapped in useCallback to prevent recreating on every render
  const fetchActivities = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetching) return;
    
    try {
      setIsFetching(true);
      setLoading(true);
      
      // Fetch quick notes
      const notesPromise = typeFilter !== 'sessions' ?
        fetch(`/api/quick-notes?limit=${limit || 1000}`).then(res => res.json()) :
        Promise.resolve({ quickNotes: [] });
      
      // Fetch sessions
      const sessionsPromise = typeFilter !== 'notes' ?
        fetch('/api/sessions?limit=1000').then(res => res.json()) :
        Promise.resolve({ sessions: [] });

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

      // Handle both old format (array) and new format (object with sessions property)
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : (sessionsData.sessions || []);
      const transformedSessions: ActivityItem[] = sessionsArray.map((session: Session) => ({
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

      // Store total count before pagination
      setTotalItems(combined.length);

      // Apply pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedItems = combined.slice(startIndex, endIndex);

      // Apply limit if specified (overrides pagination)
      if (limit && limit < paginatedItems.length) {
        setActivities(paginatedItems.slice(0, limit));
      } else {
        setActivities(paginatedItems);
      }
    } catch (error) {
      logger.error('Error fetching activities:', error);
      setActivities([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [searchTerm, typeFilter, categoryFilter, statusFilter, dateRange, agentFilter, limit, currentPage, itemsPerPage, isFetching]);

  // Combined effect for filter changes and data fetching
  useEffect(() => {
    // Reset to page 1 when filters change (but not on page change)
    const isFilterChange = currentPage === 1;
    if (!isFilterChange) {
      fetchActivities();
    }
  }, [currentPage, fetchActivities]);

  // Separate effect for filter changes that resets page
  useEffect(() => {
    setCurrentPage(1);
    // Small delay to ensure state updates are batched
    const timeoutId = setTimeout(() => {
      fetchActivities();
    }, 50);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, typeFilter, categoryFilter, statusFilter, dateRange, agentFilter]);

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
            {activities.map((item) => (
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
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRowClick(item)}
              >
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

  const renderKanbanView = () => {
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
    const sessionColumns = [
      { key: 'SCHEDULED', label: 'Scheduled', color: 'blue', icon: Calendar },
      { key: 'IN_PROGRESS', label: 'In Progress', color: 'yellow', icon: Clock },
      { key: 'COMPLETED', label: 'Completed', color: 'green', icon: CheckCircle2 },
      { key: 'CANCELLED', label: 'Cancelled', color: 'red', icon: XCircle }
    ];
    
    const noteColumns = [
      { key: 'PERFORMANCE', label: 'Performance', color: 'blue', icon: TrendingUp },
      { key: 'BEHAVIOR', label: 'Behavior', color: 'purple', icon: User },
      { key: 'TRAINING', label: 'Training', color: 'green', icon: BookOpen },
      { key: 'OTHER', label: 'Other', color: 'gray', icon: FileText }
    ];

    interface ColumnConfig {
      key: string;
      label: string;
      color: string;
      icon: React.ComponentType<{ className?: string }>;
    }

    const renderColumn = (column: ColumnConfig, items: ActivityItem[], type: 'session' | 'note') => {
      const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        gray: 'bg-gray-50 border-gray-200 text-gray-700'
      };
      
      const IconComponent = column.icon;
      const hasMore = items.length > 4;
      const displayItems = hasMore ? items.slice(0, 4) : items;
      
      return (
        <div
          key={column.key}
          className={`flex flex-col border-2 rounded-lg ${colorClasses[column.color as keyof typeof colorClasses]}`}
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
                    setTypeFilter(type === 'session' ? 'sessions' : 'notes');
                    if (type === 'session') {
                      setStatusFilter(column.key);
                    } else {
                      setCategoryFilter(column.key);
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v: string) => setTypeFilter(v as 'all' | 'notes' | 'sessions')}
              disabled={loading}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="notes">Quick Notes</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 sm:gap-4 flex-wrap">
            {typeFilter !== 'sessions' && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
            
            <Select
              value={dateRange}
              onValueChange={(v: string) => setDateRange(v as 'all' | 'today' | 'week' | 'month')}
              disabled={loading}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={agentFilter} onValueChange={setAgentFilter} disabled={loading}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
            <p>No activities found</p>
            {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all' || agentFilter !== 'all') && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                  setDateRange('all');
                  setAgentFilter('all');
                }}
                className="mt-2"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'table' ? renderTableView() : renderKanbanView()}
            
            {/* Pagination Controls */}
            {totalItems > itemsPerPage && !limit && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                      const totalPages = Math.ceil(totalItems / itemsPerPage);
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}