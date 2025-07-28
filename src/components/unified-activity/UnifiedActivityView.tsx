'use client';

import { Loader2, List, LayoutGrid } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import types

// Import hooks

// Import components
import { ActivityFilters } from './components/ActivityFilters';
import { ActivityKanbanView } from './components/ActivityKanbanView';
import { ActivityPagination } from './components/ActivityPagination';
import { ActivityTableView } from './components/ActivityTableView';
import { useActivityData } from './hooks/useActivityData';
import { useActivityFilters } from './hooks/useActivityFilters';
import { UnifiedActivityViewProps, ViewMode } from './types';

export function UnifiedActivityView({ limit, itemsPerPage = 20 }: UnifiedActivityViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Use custom hooks for data and filtering
  const { activities, agents, loading, error } = useActivityData('all', limit);

  const {
    filters,
    setSearchTerm,
    setTypeFilter,
    setCategoryFilter,
    setStatusFilter,
    setDateRange,
    setAgentFilter,
    clearAllFilters,
    pagination,
    setCurrentPage,
    filteredActivities,
    paginatedActivities,
    hasActiveFilters,
  } = useActivityFilters(activities, itemsPerPage, limit);

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error loading activities: {error}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v: string) => setViewMode(v as ViewMode)}>
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
        <ActivityFilters
          filters={filters}
          agents={agents}
          loading={loading}
          onSearchChange={setSearchTerm}
          onTypeFilterChange={setTypeFilter}
          onCategoryFilterChange={setCategoryFilter}
          onStatusFilterChange={setStatusFilter}
          onDateRangeChange={setDateRange}
          onAgentFilterChange={setAgentFilter}
          onClearFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Content */}
        {(() => {
          if (loading) {
            return (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            );
          }
          if (paginatedActivities.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <p>No activities found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearAllFilters} className="mt-2">
                    Clear all filters
                  </Button>
                )}
              </div>
            );
          }
          return (
            <>
              {viewMode === 'table' ? (
                <ActivityTableView activities={paginatedActivities} />
              ) : (
                <ActivityKanbanView
                  activities={filteredActivities}
                  typeFilter={filters.typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              )}

              {/* Pagination Controls */}
              <ActivityPagination
                pagination={pagination}
                onPageChange={setCurrentPage}
                limit={limit}
              />
            </>
          );
        })()}
      </CardContent>
    </Card>
  );
}
