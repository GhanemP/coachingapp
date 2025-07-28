'use client';

import { format, differenceInDays } from 'date-fns';
import {
  Loader2, Plus, Calendar,
  CheckCircle2, Circle, Clock, XCircle, User,
  ChevronRight, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import logger from '@/lib/logger-client';


interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number | null;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedDate: string | null;
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  agent?: {
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
  approver?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  approvedAt: string | null;
  items: ActionPlanItem[];
  completionPercentage: number;
  totalItems: number;
  completedItems: number;
}

interface ActionPlansListProps {
  agentId?: string;
  showCreateButton?: boolean;
}

export function ActionPlansList({ agentId, showCreateButton = true }: ActionPlansListProps) {
  const { data: session } = useSession();
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(agentId || '');
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  // Form state for new action plan
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    items: [
      {
        title: '',
        description: '',
        targetMetric: '',
        targetValue: 0,
        dueDate: '',
      },
    ],
  });

  // Fetch agents for team leaders and managers
  useEffect(() => {
    if (session?.user && session.user.role && ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role) && !agentId) {
      // TypeScript now recognizes session.user is defined due to optional chaining
      fetchAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role, agentId]);

  const fetchAgents = async () => {
    try {
      const endpoint = session?.user?.role === 'TEAM_LEADER' 
        ? '/api/agents?supervised=true' 
        : '/api/agents';
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || data);
      }
    } catch (error) {
      logger.error('Error fetching agents:', error as Error);
    }
  };

  // Fetch action plans
  useEffect(() => {
    fetchActionPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, agentId, selectedAgent]);

  const fetchActionPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (statusFilter && statusFilter !== 'all') {params.append('status', statusFilter);}
      if ((agentId || selectedAgent) && selectedAgent !== 'all') {params.append('agentId', agentId || selectedAgent);}

      const response = await fetch(`/api/action-plans?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActionPlans(data.actionPlans);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to fetch action plans');
      }
    } catch (error) {
      logger.error('Error fetching action plans:', error as Error);
      toast.error('Error fetching action plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.title.trim() || !newPlan.description.trim() || 
        !newPlan.startDate || !newPlan.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!agentId && !selectedAgent) {
      toast.error('Please select an agent');
      return;
    }

    // Validate items
    const validItems = newPlan.items.filter(item => 
      item.title.trim() && item.description.trim() && 
      item.targetMetric.trim() && item.targetValue > 0 && item.dueDate
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one valid action item');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPlan,
          agentId: agentId || selectedAgent,
          items: validItems,
        }),
      });

      if (response.ok) {
        toast.success('Action plan created successfully');
        setShowCreateDialog(false);
        setNewPlan({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          items: [
            {
              title: '',
              description: '',
              targetMetric: '',
              targetValue: 0,
              dueDate: '',
            },
          ],
        });
        fetchActionPlans();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create action plan');
      }
    } catch (error) {
      logger.error('Error creating action plan:', error as Error);
      toast.error('Error creating action plan');
    } finally {
      setCreating(false);
    }
  };

  const handleAddItem = () => {
    setNewPlan({
      ...newPlan,
      items: [
        ...newPlan.items,
        {
          title: '',
          description: '',
          targetMetric: '',
          targetValue: 0,
          dueDate: '',
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewPlan({
      ...newPlan,
      items: newPlan.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...newPlan.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setNewPlan({ ...newPlan, items: updatedItems });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'ACTIVE':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Circle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) {return 'Overdue';}
    if (days === 0) {return 'Due today';}
    if (days === 1) {return '1 day left';}
    return `${days} days left`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Action Plans</CardTitle>
          {showCreateButton && session?.user?.role && ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role) && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Action Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Action Plan</DialogTitle>
                  <DialogDescription>
                    Create a comprehensive action plan with specific goals and metrics.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!agentId && session?.user?.role && ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role) && (
                    <div>
                      <Label htmlFor="agent">Agent</Label>
                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name || agent.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="title">Plan Title</Label>
                    <Input
                      id="title"
                      value={newPlan.title}
                      onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                      placeholder="Enter action plan title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                      placeholder="Describe the action plan objectives..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newPlan.startDate}
                        onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newPlan.endDate}
                        onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Action Items</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddItem}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    
                    {newPlan.items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Item {index + 1}</h4>
                          {newPlan.items.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Title</Label>
                            <Input
                              value={item.title}
                              onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                              placeholder="Item title"
                            />
                          </div>
                          <div>
                            <Label>Target Metric</Label>
                            <Input
                              value={item.targetMetric}
                              onChange={(e) => handleItemChange(index, 'targetMetric', e.target.value)}
                              placeholder="e.g., Call Resolution Rate"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Describe the action item..."
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Target Value</Label>
                            <Input
                              type="number"
                              value={item.targetValue}
                              onChange={(e) => handleItemChange(index, 'targetValue', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 85"
                            />
                          </div>
                          <div>
                            <Label>Due Date</Label>
                            <Input
                              type="date"
                              value={item.dueDate}
                              onChange={(e) => handleItemChange(index, 'dueDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePlan} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Action Plan
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {!agentId && session?.user?.role && ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role) && (
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
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
          )}
        </div>

        {/* Action Plans List */}
        {(() => {
          if (loading) {
            return (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            );
          }
          if (actionPlans.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                No action plans found
              </div>
            );
          }
          return (
          <div className="space-y-4">
            {actionPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/action-plans/${plan.id}`}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(plan.status)}
                      <h4 className="font-medium text-lg">{plan.title}</h4>
                      <Badge className={getStatusColor(plan.status)}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{plan.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{plan.completionPercentage}%</span>
                      </div>
                      <Progress value={plan.completionPercentage} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>{plan.completedItems} of {plan.totalItems} items completed</span>
                        {plan.status === 'ACTIVE' && (
                          <span>{getDaysRemaining(plan.endDate)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Agent: {plan.agent ? (plan.agent.name || plan.agent.email) : 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(plan.startDate), 'MMM d')} - {format(new Date(plan.endDate), 'MMM d, yyyy')}
                      </span>
                      <span>Created by: {plan.creator.name || plan.creator.email}</span>
                      {plan.approver && (
                        <span>Approved by: {plan.approver.name || plan.approver.email}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                </div>
              </Link>
            ))}
          </div>
         );
       })()}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}