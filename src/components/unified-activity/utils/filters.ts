import { ActivityItem, ActivityFilters, DateRange } from '../types';

export function applySearchFilter(activities: ActivityItem[], searchTerm: string): ActivityItem[] {
  if (!searchTerm) {
    return activities;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  return activities.filter(
    item =>
      item.title.toLowerCase().includes(lowerSearchTerm) ||
      item.description?.toLowerCase().includes(lowerSearchTerm) ||
      item.agent.name?.toLowerCase().includes(lowerSearchTerm) ||
      item.agent.email.toLowerCase().includes(lowerSearchTerm)
  );
}

export function applyCategoryFilter(
  activities: ActivityItem[],
  categoryFilter: string
): ActivityItem[] {
  if (categoryFilter === 'all') {
    return activities;
  }
  return activities.filter(item => item.category === categoryFilter);
}

export function applyStatusFilter(
  activities: ActivityItem[],
  statusFilter: string
): ActivityItem[] {
  if (statusFilter === 'all') {
    return activities;
  }
  return activities.filter(item => item.status === statusFilter);
}

export function applyAgentFilter(activities: ActivityItem[], agentFilter: string): ActivityItem[] {
  if (agentFilter === 'all') {
    return activities;
  }
  return activities.filter(item => item.agent.id === agentFilter);
}

export function applyDateRangeFilter(
  activities: ActivityItem[],
  dateRange: DateRange
): ActivityItem[] {
  if (dateRange === 'all') {
    return activities;
  }

  const now = new Date();
  return activities.filter(item => {
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

export function applyAllFilters(
  activities: ActivityItem[],
  filters: ActivityFilters
): ActivityItem[] {
  let filtered = activities;

  filtered = applySearchFilter(filtered, filters.searchTerm);
  filtered = applyCategoryFilter(filtered, filters.categoryFilter);
  filtered = applyStatusFilter(filtered, filters.statusFilter);
  filtered = applyAgentFilter(filtered, filters.agentFilter);
  filtered = applyDateRangeFilter(filtered, filters.dateRange);

  return filtered;
}

export function applyPagination(
  activities: ActivityItem[],
  currentPage: number,
  itemsPerPage: number,
  limit?: number
): ActivityItem[] {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = activities.slice(startIndex, endIndex);

  // Apply limit if specified (overrides pagination)
  if (limit && limit < paginatedItems.length) {
    return paginatedItems.slice(0, limit);
  }

  return paginatedItems;
}
