'use client';

import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Plus,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  Search,
  Download,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Users,
  TrendingUp,
  CalendarDays,
  CheckSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole, SessionStatus } from '@/lib/constants';
import logger from '@/lib/logger-client';

// import { cn } from "@/lib/utils"; // Unused import

interface Session {
  id: string;
  agentId: string;
  teamLeaderId: string;
  sessionDate: string;
  scheduledDate: string;
  status: SessionStatus;
  previousScore?: number;
  currentScore?: number;
  preparationNotes?: string;
  sessionNotes?: string;
  actionItems?: string;
  followUpDate?: string;
  duration?: number;
  agent: {
    id: string;
    name: string;
    email: string;
    agentProfile?: {
      employeeId: string;
    };
  };
  teamLeader: {
    id: string;
    name: string;
    email: string;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface SessionsResponse {
  sessions: Session[];
  pagination: PaginationInfo;
}

const statusConfig = {
  [SessionStatus.SCHEDULED]: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-800',
    icon: Calendar,
  },
  [SessionStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Timer,
  },
  [SessionStatus.COMPLETED]: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  [SessionStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle,
  },
  [SessionStatus.NO_SHOW]: {
    label: 'No Show',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
  },
};

const sortOptions = [
  { value: 'scheduledDate-desc', label: 'Date (Newest First)' },
  { value: 'scheduledDate-asc', label: 'Date (Oldest First)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
  { value: 'agent.name-asc', label: 'Agent Name (A-Z)' },
  { value: 'agent.name-desc', label: 'Agent Name (Z-A)' },
];

export default function SessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState('scheduledDate-desc');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [teamLeaders, setTeamLeaders] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string>('all');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch sessions with filters
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());

      const [sortField, sortOrder] = sortBy.split('-');
      params.append('sortBy', sortField);
      params.append('sortOrder', sortOrder);

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (selectedAgentId !== 'all') {
        params.append('agentId', selectedAgentId);
      }

      if (selectedTeamLeaderId !== 'all') {
        params.append('teamLeaderId', selectedTeamLeaderId);
      }

      if (dateRange?.from) {
        params.append('dateFrom', dateRange.from.toISOString());
      }

      if (dateRange?.to) {
        params.append('dateTo', dateRange.to.toISOString());
      }

      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      const response = await fetch(`/api/sessions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data: SessionsResponse = await response.json();
      setSessions(data.sessions);
      setPagination(data.pagination);

      // Extract unique agents and team leaders for filters
      const uniqueAgents = new Map();
      const uniqueTeamLeaders = new Map();

      data.sessions.forEach(session => {
        uniqueAgents.set(session.agent.id, session.agent.name);
        uniqueTeamLeaders.set(session.teamLeader.id, session.teamLeader.name);
      });

      setAgents(Array.from(uniqueAgents, ([id, name]) => ({ id, name })));
      setTeamLeaders(Array.from(uniqueTeamLeaders, ([id, name]) => ({ id, name })));
    } catch (error) {
      logger.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    sortBy,
    statusFilter,
    selectedAgentId,
    selectedTeamLeaderId,
    dateRange,
    debouncedSearchTerm,
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSessions();
    }
  }, [status, fetchSessions]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = pagination.totalCount;
    const scheduled = sessions.filter(s => s.status === SessionStatus.SCHEDULED).length;
    const completed = sessions.filter(s => s.status === SessionStatus.COMPLETED).length;
    const cancelled = sessions.filter(s => s.status === SessionStatus.CANCELLED).length;

    return { total, scheduled, completed, cancelled };
  }, [sessions, pagination.totalCount]);

  const allowedRoles: UserRole[] = [UserRole.TEAM_LEADER, UserRole.MANAGER, UserRole.ADMIN];
  const canCreateSession =
    session?.user?.role && allowedRoles.includes(session.user.role as UserRole);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSessions(new Set(sessions.map(s => s.id)));
    } else {
      setSelectedSessions(new Set());
    }
  };

  const handleSelectSession = (sessionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSessions);
    if (checked) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleBulkExport = async () => {
    try {
      const params = new URLSearchParams();
      selectedSessions.forEach(id => params.append('sessionIds', id));

      const response = await fetch(`/api/export/sessions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export sessions');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Error exporting sessions:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: string) => {
    setPagination(prev => ({ ...prev, pageSize: parseInt(newSize), page: 1 }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coaching Sessions</h1>
          <p className="text-gray-600 mt-2">
            {session?.user?.role === UserRole.AGENT
              ? 'View your coaching sessions and progress'
              : 'Manage and track coaching sessions with your team'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            title={viewMode === 'list' ? 'Calendar View' : 'List View'}
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
          {canCreateSession && (
            <Button onClick={() => router.push('/sessions/plan')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Session Plan
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search and Sort Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {session?.user?.role !== UserRole.AGENT && (
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(session?.user?.role === UserRole.MANAGER ||
                session?.user?.role === UserRole.ADMIN) && (
                <Select value={selectedTeamLeaderId} onValueChange={setSelectedTeamLeaderId}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="All Team Leaders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Leaders</SelectItem>
                    {teamLeaders.map(leader => (
                      <SelectItem key={leader.id} value={leader.id}>
                        {leader.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full md:w-auto"
              />

              {selectedSessions.size > 0 && (
                <Button variant="outline" onClick={handleBulkExport} className="ml-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export ({selectedSessions.size})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {viewMode === 'list' ? (
        <>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
                <p className="text-gray-500">
                  {canCreateSession
                    ? 'Start by creating your first coaching session plan.'
                    : "You don't have any coaching sessions scheduled yet."}
                </p>
                {canCreateSession && (
                  <Button onClick={() => router.push('/sessions/plan')} className="mt-4">
                    Create Your First Session
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  checked={selectedSessions.size === sessions.length && sessions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select all</span>
              </div>

              {/* Sessions Cards */}
              <div className="grid gap-4">
                {sessions.map(session => {
                  const StatusIcon = statusConfig[session.status].icon;
                  let preparationData = null;

                  // Safely parse preparation notes
                  if (session.preparationNotes) {
                    try {
                      preparationData = JSON.parse(session.preparationNotes);
                    } catch {
                      logger.warn('Failed to parse preparation notes for session:', session.id);
                      preparationData = { title: session.preparationNotes };
                    }
                  }

                  return (
                    <Card key={session.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedSessions.has(session.id)}
                            onCheckedChange={checked =>
                              handleSelectSession(session.id, checked as boolean)
                            }
                            onClick={e => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <CardTitle className="text-lg">
                                  {preparationData?.title || 'Coaching Session'}
                                </CardTitle>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span>{session.agent.name}</span>
                                    {session.agent.agentProfile?.employeeId && (
                                      <span className="text-gray-400">
                                        ({session.agent.agentProfile.employeeId})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {format(new Date(session.scheduledDate), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{format(new Date(session.scheduledDate), 'h:mm a')}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge className={statusConfig[session.status].color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig[session.status].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {preparationData?.objectives && preparationData.objectives.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Objectives</h4>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {preparationData.objectives
                                  .slice(0, 2)
                                  .map((objective: string, index: number) => (
                                    <li key={index}>{objective}</li>
                                  ))}
                                {preparationData.objectives.length > 2 && (
                                  <li className="text-gray-400">
                                    +{preparationData.objectives.length - 2} more
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {preparationData?.focusAreas && preparationData.focusAreas.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                Focus Areas
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {preparationData.focusAreas.map((area: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {area
                                      .replace(/_/g, ' ')
                                      .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <div className="text-sm text-gray-500">
                              Led by {session.teamLeader.name}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/sessions/${session.id}`)}
                            >
                              View Details
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                    {pagination.totalCount} results
                  </span>
                  <Select
                    value={pagination.pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.hasPreviousPage}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={!pagination.hasNextPage}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // Calendar View (placeholder for now)
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View Coming Soon</h3>
            <p className="text-gray-500">The calendar view is currently under development.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
