'use client';

import { format, isPast } from 'date-fns';
import {
  Loader2,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  User,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import logger from '@/lib/logger-client';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate: string;
  completedDate: string | null;
  createdAt: string;
  agent: {
    id: string;
    name: string | null;
    email: string;
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  assignee: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  session?: {
    id: string;
    sessionDate: string;
    status: string;
  } | null;
}

interface ActionItemsListProps {
  agentId?: string;
  sessionId?: string;
  showCreateButton?: boolean;
}

export function ActionItemsList({
  agentId,
  sessionId,
  showCreateButton = true,
}: ActionItemsListProps) {
  const { data: session } = useSession();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(agentId || 'all');
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string }>>(
    []
  );

  // Form state for new action item
  const [newItem, setNewItem] = useState<{
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate: string;
    assignedTo: string;
  }>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedTo: '',
  });

  // Fetch agents function wrapped in useCallback
  const fetchAgents = useCallback(async () => {
    try {
      const endpoint =
        session?.user?.role === 'TEAM_LEADER' ? '/api/agents?supervised=true' : '/api/agents';
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || data);
      }
    } catch (error) {
      logger.error('Error fetching agents:', error as Error);
    }
  }, [session?.user?.role]);

  // Fetch agents for team leaders and managers
  useEffect(() => {
    if (session?.user?.role !== 'AGENT' && !agentId) {
      fetchAgents();
    }
  }, [session, agentId, fetchAgents]);

  // Reset page to 1 when filters or agents change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, selectedAgent, agentId]);

  // Fetch action items function wrapped in useCallback
  const fetchActionItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (priorityFilter && priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      if (agentId || (selectedAgent && selectedAgent !== 'all')) {
        params.append('agentId', agentId || selectedAgent);
      }
      if (sessionId) {
        params.append('sessionId', sessionId);
      }

      const response = await fetch(`/api/action-items?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActionItems(data.actionItems);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to fetch action items');
      }
    } catch (error) {
      logger.error('Error fetching action items:', error as Error);
      toast.error('Error fetching action items');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, page, agentId, selectedAgent, sessionId]);

  // Fetch action items
  useEffect(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  const handleCreateItem = async () => {
    // Validate required fields
    if (!newItem.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!newItem.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!newItem.dueDate) {
      toast.error('Please select a due date');
      return;
    }

    // Validate agent selection
    const effectiveAgentId = agentId || (selectedAgent !== 'all' ? selectedAgent : '');

    // Additional validation to ensure we have a valid agentId
    if (!effectiveAgentId || effectiveAgentId === 'all') {
      toast.error('Please select an agent');
      return;
    }

    // Validate that the selected agent exists in our agents list
    if (agents && !agents.some(agent => agent.id === effectiveAgentId)) {
      toast.error('Please select a valid agent');
      return;
    }

    try {
      setCreating(true);

      // Format the dueDate to be compatible with Zod's datetime validation
      let formattedDueDate = newItem.dueDate;
      if (newItem.dueDate) {
        // Always convert datetime-local format to ISO format for API
        // datetime-local provides format like "2025-07-25T10:16"
        // Zod expects full ISO format like "2025-07-25T10:16:00.000Z"
        try {
          const dateObj = new Date(newItem.dueDate);
          // Check if the date is valid
          if (!isNaN(dateObj.getTime())) {
            formattedDueDate = dateObj.toISOString();
          } else {
            logger.error('Invalid date:', newItem.dueDate);
          }
        } catch (e) {
          logger.error('Error formatting dueDate:', e);
        }
      }

      // Format the data for API submission
      const requestData = {
        ...newItem,
        dueDate: formattedDueDate,
        agentId: effectiveAgentId,
        sessionId: sessionId,
        assignedTo: newItem.assignedTo || effectiveAgentId,
      };

      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success('Action item created successfully');
        setShowCreateDialog(false);
        setNewItem({
          title: '',
          description: '',
          priority: 'MEDIUM',
          dueDate: '',
          assignedTo: '',
        });
        fetchActionItems();
      } else {
        const error = await response.json();
        // Show detailed validation errors if available
        if (error.details && Array.isArray(error.details)) {
          const errorMessages = error.details
            .map((detail: { message: string }) => detail.message)
            .join(', ');
          toast.error(`Validation error: ${errorMessages}`);
        } else {
          toast.error(error.error || 'Failed to create action item');
        }
      }
    } catch (error) {
      logger.error('Error creating action item:', error as Error);
      toast.error('Error creating action item');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status updated successfully');
        fetchActionItems();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update status');
      }
    } catch (error) {
      logger.error('Error updating status:', error as Error);
      toast.error('Error updating status');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this action item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/action-items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Action item deleted successfully');
        fetchActionItems();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete action item');
      }
    } catch (error) {
      logger.error('Error deleting action item:', error as Error);
      toast.error('Error deleting action item');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Circle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'COMPLETED' && status !== 'CANCELLED' && isPast(new Date(dueDate));
  };

  const getPageNumber = (currentPage: number, totalPages: number, index: number) => {
    if (currentPage <= 3) {
      return index + 1;
    }
    if (currentPage >= totalPages - 2) {
      return totalPages - 4 + index;
    }
    return currentPage - 2 + index;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Action Items</CardTitle>
          {showCreateButton && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Action Item</DialogTitle>
                  <DialogDescription>
                    Create a new action item to track tasks and improvements.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!agentId && session?.user?.role !== 'AGENT' && (
                    <div>
                      <Label htmlFor="agent">Agent</Label>
                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name || agent.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Enter action item title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Describe the action item in detail..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newItem.priority}
                        onValueChange={value =>
                          setNewItem({ ...newItem, priority: value as 'HIGH' | 'MEDIUM' | 'LOW' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="datetime-local"
                        value={newItem.dueDate}
                        onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  {session?.user?.role !== 'AGENT' && (
                    <div>
                      <Label htmlFor="assignedTo">Assign To (Optional)</Label>
                      <Select
                        value={newItem.assignedTo}
                        onValueChange={value =>
                          setNewItem({ ...newItem, assignedTo: value === 'default' ? '' : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to agent by default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Agent (Default)</SelectItem>
                          {agents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name || agent.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateItem} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Action Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          {!agentId && session?.user?.role !== 'AGENT' && (
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Action Items List */}
        {(() => {
          if (loading) {
            return (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            );
          }
          if (actionItems.length === 0) {
            return <div className="text-center py-8 text-gray-500">No action items found</div>;
          }
          return (
            <div className="max-h-[70vh] min-h-[400px] overflow-y-auto border rounded-lg">
              <div className="space-y-4 p-4">
                {actionItems.map(item => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                      isOverdue(item.dueDate, item.status) ? 'border-red-300 bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(item.status)}
                          <h4 className="font-medium text-lg">{item.title}</h4>
                          <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                          {isOverdue(item.dueDate, item.status) && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Agent: {item.agent.name || item.agent.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Assigned: {item.assignee.name || item.assignee.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {format(new Date(item.dueDate), 'MMM d, yyyy h:mm a')}
                          </span>
                          {item.completedDate && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed: {format(new Date(item.completedDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span>Created by: {item.creator.name || item.creator.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                          <Select
                            value={item.status}
                            onValueChange={value => handleUpdateStatus(item.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {(item.creator.id === session?.user?.id ||
                          session?.user?.role === 'MANAGER' ||
                          session?.user?.role === 'ADMIN') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <Button
              aria-label="Previous page"
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = getPageNumber(page, totalPages, i);

              return (
                <Button
                  key={`page-${pageNum}`}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </Button>
              );
            })}

            {totalPages > 5 && (
              <>
                {page < totalPages - 3 && <span className="px-2">...</span>}
                <Button
                  variant={page === totalPages ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  aria-current={page === totalPages ? 'page' : undefined}
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              aria-label="Next page"
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Go to:</span>
              <Input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                className="w-16"
                aria-label="Page number"
              />
              <Button
                size="sm"
                onClick={() => {
                  const newPage = Math.max(1, Math.min(totalPages, Number(pageInput)));
                  setPage(newPage);
                  setPageInput('');
                }}
              >
                Go
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
