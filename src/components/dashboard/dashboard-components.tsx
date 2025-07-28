'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dashboard Action Card Component
 * Reusable card for dashboard quick actions
 */
export function DashboardActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  buttonText,
  className = '',
  variant = 'default',
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  buttonText: string;
  className?: string;
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'gray';
}) {
  const variantClasses = {
    default: 'bg-white hover:bg-gray-50',
    blue: 'bg-blue-100 hover:bg-blue-200',
    green: 'bg-green-100 hover:bg-green-200',
    purple: 'bg-purple-100 hover:bg-purple-200',
    gray: 'bg-gray-100 hover:bg-gray-200',
  };

  return (
    <Card
      className={`${variantClasses[variant]} hover:shadow-lg transition-shadow cursor-pointer ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <Button
          className="w-full"
          variant="outline"
          onClick={e => {
            e.stopPropagation();
            onClick();
          }}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Stat Card Component
 * Reusable card for displaying statistics
 */
export function DashboardStatCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  className = '',
}: {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">
              {value}
              {unit && <span className="text-lg font-normal">{unit}</span>}
            </p>
            {trend && trendValue && <p className={`text-sm ${trendColors[trend]}`}>{trendValue}</p>}
          </div>
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard List Item Component
 * Reusable component for list items in dashboards
 */
export function DashboardListItem({
  title,
  subtitle,
  metadata,
  actions,
  onClick,
  className = '',
}: {
  title: string;
  subtitle?: string;
  metadata?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          {metadata && <div className="mt-2">{metadata}</div>}
        </div>
        {actions && <div className="ml-4">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Dashboard Empty State Component
 * Reusable empty state for dashboard sections
 */
export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  );
}

/**
 * Dashboard Quick Actions Grid
 * Grid layout for dashboard action cards
 */
export function DashboardQuickActions({
  children,
  columns = 4,
  className = 'mb-8',
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={`grid ${gridCols[columns]} gap-6 ${className}`}>{children}</div>;
}

/**
 * Dashboard Content Section
 * Wrapper for dashboard content sections
 */
export function DashboardContentSection({
  title,
  children,
  actions,
  className = 'mb-8',
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">{children}</div>
    </div>
  );
}

const DashboardComponents = {
  DashboardActionCard,
  DashboardStatCard,
  DashboardListItem,
  DashboardEmptyState,
  DashboardQuickActions,
  DashboardContentSection,
};

export default DashboardComponents;
