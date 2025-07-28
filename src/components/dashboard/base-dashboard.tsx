"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { UserRole } from "@/lib/constants";

interface BaseDashboardProps {
  children: (data: unknown) => ReactNode;
  requiredRole?: UserRole;
  title: string;
  subtitle?: string;
  apiEndpoint?: string;
  className?: string;
}

interface DashboardState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isCheckingAuth: boolean;
}

/**
 * Base Dashboard Component
 * 
 * Consolidates common dashboard functionality:
 * - Authentication and authorization checks
 * - Loading and error states
 * - Data fetching patterns
 * - Consistent UI structure
 */
export function BaseDashboard<T = unknown>({
  children,
  requiredRole,
  title,
  subtitle,
  apiEndpoint = "/api/dashboard",
  className = "container mx-auto py-8 px-4"
}: BaseDashboardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [state, setState] = useState<DashboardState<T>>({
    data: null,
    loading: true,
    error: null,
    isCheckingAuth: true
  });

  // Authentication and authorization check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      // Check role authorization if required
      if (requiredRole && session?.user?.role !== requiredRole) {
        router.push("/dashboard");
        return;
      }
      
      setState(prev => ({ ...prev, isCheckingAuth: false }));
    }
  }, [status, session, router, requiredRole]);

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
        }
        
        const data = await response.json();
        setState(prev => ({ ...prev, data, loading: false }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : "An error occurred",
          loading: false
        }));
      }
    };

    // Only fetch data if authenticated and authorized
    if (status === "authenticated" && !state.isCheckingAuth) {
      if (!requiredRole || session?.user?.role === requiredRole) {
        fetchData();
      }
    }
  }, [status, session, apiEndpoint, requiredRole, state.isCheckingAuth]);

  // Loading state
  if (status === "loading" || state.isCheckingAuth || state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {state.error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!state.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  // Render dashboard content
  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-gray-600 mt-2">{subtitle}</p>
        )}
      </div>

      {/* Dashboard content */}
      {children(state.data)}
    </div>
  );
}

/**
 * Dashboard Header Component
 * Standardized header for all dashboards
 */
export function DashboardHeader({ 
  title, 
  subtitle, 
  actions 
}: { 
  title: string; 
  subtitle?: string; 
  actions?: ReactNode;
}) {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-gray-600 mt-2">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard Stats Grid Component
 * Reusable stats grid for metrics display
 */
export function DashboardStatsGrid({ 
  children, 
  columns = 4 
}: { 
  children: ReactNode; 
  columns?: number;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-6 mb-8`}>
      {children}
    </div>
  );
}

/**
 * Dashboard Section Component
 * Standardized section wrapper
 */
export function DashboardSection({ 
  title, 
  children, 
  actions,
  className = "mb-8"
}: { 
  title?: string; 
  children: ReactNode; 
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export default BaseDashboard;