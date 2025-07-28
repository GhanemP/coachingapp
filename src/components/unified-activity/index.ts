// Main component
export { UnifiedActivityView } from './UnifiedActivityView';

// Types
export type {
  UnifiedActivityViewProps,
  ActivityItem,
  QuickNote,
  Session,
  Agent,
  ViewMode,
  TypeFilter,
  DateRange,
  ActivityFilters as ActivityFiltersType,
  PaginationState,
  ColumnConfig
} from './types';

// Hooks
export { useActivityData } from './hooks/useActivityData';
export { useActivityFilters } from './hooks/useActivityFilters';

// Components
export { ActivityFilters } from './components/ActivityFilters';
export { ActivityTableView } from './components/ActivityTableView';
export { ActivityKanbanView } from './components/ActivityKanbanView';
export { ActivityPagination } from './components/ActivityPagination';

// Utils
export {
  transformNotesToActivities,
  transformSessionsToActivities,
  combineAndSortActivities
} from './utils/data-transformers';

export {
  applySearchFilter,
  applyCategoryFilter,
  applyStatusFilter,
  applyAgentFilter,
  applyDateRangeFilter,
  applyAllFilters,
  applyPagination
} from './utils/filters';

export {
  getStatusColor,
  getCategoryColor,
  kanbanColorClasses
} from './utils/styling';