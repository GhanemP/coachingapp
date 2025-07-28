export function getStatusColor(status: string): string {
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
}

export function getCategoryColor(category: string): string {
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
}

export const kanbanColorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700'
} as const;

export type KanbanColor = keyof typeof kanbanColorClasses;