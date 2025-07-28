import { useState, useMemo, useCallback, useEffect } from 'react';

import { ActivityItem, ActivityFilters, TypeFilter, DateRange, PaginationState } from '../types';
import { applyAllFilters, applyPagination } from '../utils/filters';

interface UseActivityFiltersReturn {
  // Filter state
  filters: ActivityFilters;
  setSearchTerm: (term: string) => void;
  setTypeFilter: (type: TypeFilter) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;
  setDateRange: (range: DateRange) => void;
  setAgentFilter: (agent: string) => void;
  clearAllFilters: () => void;
  
  // Pagination state
  pagination: PaginationState;
  setCurrentPage: (page: number) => void;
  
  // Filtered and paginated data
  filteredActivities: ActivityItem[];
  paginatedActivities: ActivityItem[];
  
  // Helper functions
  hasActiveFilters: boolean;
}

export function useActivityFilters(
  activities: ActivityItem[],
  itemsPerPage: number = 20,
  limit?: number
): UseActivityFiltersReturn {
  // Filter state
  const [filters, setFilters] = useState<ActivityFilters>({
    searchTerm: '',
    typeFilter: 'all',
    categoryFilter: 'all',
    statusFilter: 'all',
    dateRange: 'all',
    agentFilter: 'all'
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage
  });

  // Filter setters that reset pagination
  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const setTypeFilter = useCallback((type: TypeFilter) => {
    setFilters(prev => ({ ...prev, typeFilter: type }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const setCategoryFilter = useCallback((category: string) => {
    setFilters(prev => ({ ...prev, categoryFilter: category }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const setStatusFilter = useCallback((status: string) => {
    setFilters(prev => ({ ...prev, statusFilter: status }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const setDateRange = useCallback((range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const setAgentFilter = useCallback((agent: string) => {
    setFilters(prev => ({ ...prev, agentFilter: agent }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      typeFilter: 'all',
      categoryFilter: 'all',
      statusFilter: 'all',
      dateRange: 'all',
      agentFilter: 'all'
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Apply filters
  const filteredActivities = useMemo(() => {
    return applyAllFilters(activities, filters);
  }, [activities, filters]);

  // Update total items when filtered activities change
  useEffect(() => {
    setPagination(prev => ({ ...prev, totalItems: filteredActivities.length }));
  }, [filteredActivities.length]);

  // Apply pagination
  const paginatedActivities = useMemo(() => {
    return applyPagination(filteredActivities, pagination.currentPage, pagination.itemsPerPage, limit);
  }, [filteredActivities, pagination.currentPage, pagination.itemsPerPage, limit]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.searchTerm !== '' ||
           filters.typeFilter !== 'all' ||
           filters.categoryFilter !== 'all' ||
           filters.statusFilter !== 'all' ||
           filters.dateRange !== 'all' ||
           filters.agentFilter !== 'all';
  }, [filters]);

  return {
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
    hasActiveFilters
  };
}