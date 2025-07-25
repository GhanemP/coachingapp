'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, Calendar, Target, User, Clock, 
  CheckCircle2, Circle, XCircle, Edit, 
  ChevronLeft, TrendingUp, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';

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

export default function ActionPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionPlanItem | null>(null);
  const [itemUpdate, setItemUpdate] = useState({
    currentValue: 0,
    status: 'PENDING' as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
  });
  const [planId, setPlanId] = useState<string | null>(null);

  // Handle async params
  useEffect(() => {
    params.then((resolvedParams) => {
      setPlanId(resolvedParams.id);
    });
  }, [params]);

  const fetchActionPlan = useCallback(async () => {
    if (!planId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/action-plans/${planId}`);
      if (response.ok) {
        const data = await response.json();
        setActionPlan(data);
      } else if (response.status === 404) {
        toast.error('Action plan not found');
        router.push('/dashboard');
      } else {
        toast.error('Failed to fetch action plan');
      }
    } catch (error) {
      console.error('Error fetching action plan:', error);
      toast.error('Error fetching action plan');
    } finally {
      setLoading(false);
    }
  }, [planId, router]);

  useEffect(() => {
    if (planId) {
      fetchActionPlan();
    }
  }, [fetchActionPlan, planId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!actionPlan) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/action-plans/${actionPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Action plan status updated');
        fetchActionPlan();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      setUpdating(true);
      const response = await fetch(
        `/api/action-plans/${actionPlan?.id}/items/${editingItem.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemUpdate),
        }
      );

      if (response.ok) {
        toast.success('Item updated successfully');
        setShowEditDialog(false);
        setEditingItem(null);
        fetchActionPlan();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error updating item');
    } finally {
      setUpdating(false);
    }
  };

  const openEditDialog = (item: ActionPlanItem) => {
    setEditingItem(item);
    setItemUpdate({
      currentValue: item.currentValue || 0,
      status: item.status,
    });
    setShowEditDialog(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (days === 0) return { text: 'Due today', color: 'text-orange-600' };
    if (days === 1) return { text: '1 day left', color: 'text-yellow-600' };
    if (days <= 7) return { text: `${days} days left`, color: 'text-yellow-600' };
    return { text: `${days} days left`, color: 'text-gray-600' };
  };

  const canEditPlan = session?.user?.role && ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role);
  const canApprovePlan = session?.user?.role && ['MANAGER', 'ADMIN'].includes(session.user.role);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!actionPlan) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Action plan not found</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {canEditPlan && actionPlan.status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={() => handleUpdateStatus('ACTIVE')}
              disabled={updating}
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Activate Plan
            </Button>
          )}
          {canApprovePlan && actionPlan.status === 'ACTIVE' && !actionPlan.approvedAt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus('ACTIVE')}
              disabled={updating}
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve Plan
            </Button>
          )}
          {canEditPlan && actionPlan.status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={updating}
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark as Completed
            </Button>
          )}
        </div>
      </div>

      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {getStatusIcon(actionPlan.status)}
                <CardTitle className="text-2xl">{actionPlan.title}</CardTitle>
                <Badge className={getStatusColor(actionPlan.status)}>
                  {actionPlan.status}
                </Badge>
              </div>
              <p className="text-gray-700">{actionPlan.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-medium">{actionPlan.completionPercentage}%</span>
            </div>
            <Progress value={actionPlan.completionPercentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>{actionPlan.completedItems} of {actionPlan.totalItems} items completed</span>
              {actionPlan.status === 'ACTIVE' && (
                <span className={getDaysRemaining(actionPlan.endDate).color}>
                  {getDaysRemaining(actionPlan.endDate).text}
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <User className="h-3 w-3" />
                Agent
              </p>
              <p className="text-sm font-medium">
                {actionPlan.agent.name || actionPlan.agent.email}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Duration
              </p>
              <p className="text-sm font-medium">
                {format(new Date(actionPlan.startDate), 'MMM d')} - {format(new Date(actionPlan.endDate), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Created by</p>
              <p className="text-sm font-medium">
                {actionPlan.creator.name || actionPlan.creator.email}
              </p>
            </div>
            {actionPlan.approver && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Approved by</p>
                <p className="text-sm font-medium">
                  {actionPlan.approver.name || actionPlan.approver.email}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actionPlan.items.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(item.status)}
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                    
                    {/* Metrics */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Target:</span>
                        <span className="font-medium">
                          {item.targetMetric} = {item.targetValue}
                        </span>
                      </div>
                      {item.currentValue !== null && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Current:</span>
                          <span className="font-medium">{item.currentValue}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Due:</span>
                        <span className={`font-medium ${getDaysRemaining(item.dueDate).color}`}>
                          {format(new Date(item.dueDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {item.currentValue !== null && (
                      <div className="mt-3">
                        <Progress 
                          value={(item.currentValue / item.targetValue) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                  {canEditPlan && actionPlan.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Action Item</DialogTitle>
            <DialogDescription>
              Update the progress and status of this action item.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{editingItem.title}</h4>
                <p className="text-sm text-gray-600">{editingItem.description}</p>
              </div>
              <div>
                <Label htmlFor="currentValue">Current Value</Label>
                <Input
                  id="currentValue"
                  type="number"
                  value={itemUpdate.currentValue}
                  onChange={(e) => setItemUpdate({ ...itemUpdate, currentValue: parseFloat(e.target.value) || 0 })}
                  placeholder={`Target: ${editingItem.targetValue}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Target: {editingItem.targetMetric} = {editingItem.targetValue}
                </p>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={itemUpdate.status}
                  onValueChange={(value) => setItemUpdate({ ...itemUpdate, status: value as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}