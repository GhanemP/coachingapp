import { Search } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ActivityFilters as ActivityFiltersType, Agent, TypeFilter, DateRange } from '../types';

interface ActivityFiltersProps {
  filters: ActivityFiltersType;
  agents: Agent[];
  loading: boolean;
  onSearchChange: (term: string) => void;
  onTypeFilterChange: (type: TypeFilter) => void;
  onCategoryFilterChange: (category: string) => void;
  onStatusFilterChange: (status: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  onAgentFilterChange: (agent: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ActivityFilters({
  filters,
  agents,
  loading,
  onSearchChange,
  onTypeFilterChange,
  onCategoryFilterChange,
  onStatusFilterChange,
  onDateRangeChange,
  onAgentFilterChange,
  onClearFilters,
  hasActiveFilters,
}: ActivityFiltersProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search activities..."
              value={filters.searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>
        <Select value={filters.typeFilter} onValueChange={onTypeFilterChange} disabled={loading}>
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
        {filters.typeFilter !== 'sessions' && (
          <Select
            value={filters.categoryFilter}
            onValueChange={onCategoryFilterChange}
            disabled={loading}
          >
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

        {filters.typeFilter !== 'notes' && (
          <Select
            value={filters.statusFilter}
            onValueChange={onStatusFilterChange}
            disabled={loading}
          >
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

        <Select value={filters.dateRange} onValueChange={onDateRangeChange} disabled={loading}>
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

        <Select value={filters.agentFilter} onValueChange={onAgentFilterChange} disabled={loading}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClearFilters} disabled={loading}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
