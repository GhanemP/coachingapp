/**
 * Lazy Load Wrapper Component
 *
 * Provides intelligent lazy loading with:
 * - Intersection Observer API for viewport detection
 * - Configurable loading thresholds
 * - Skeleton loading states
 * - Error boundaries for failed loads
 * - Performance monitoring integration
 */

'use client';

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';

import { usePerformanceMonitor } from '@/lib/performance-monitor';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  minHeight?: number;
  componentName?: string;
}

/**
 * Default skeleton loader
 */
const DefaultSkeleton: React.FC<{ minHeight?: number }> = ({ minHeight = 200 }) => (
  <div className="animate-pulse bg-gray-200 rounded-lg" style={{ minHeight: `${minHeight}px` }}>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
  </div>
);

/**
 * Lazy Load Wrapper Component
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  minHeight = 200,
  componentName = 'LazyLoadWrapper',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const { recordRender } = usePerformanceMonitor(componentName);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          recordRender();
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hasLoaded, recordRender]);

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback || <DefaultSkeleton minHeight={minHeight} />}>
          {children}
        </Suspense>
      ) : (
        fallback || <DefaultSkeleton minHeight={minHeight} />
      )}
    </div>
  );
};

/**
 * Higher-order component for lazy loading
 */
export function withLazyLoading<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ReactNode;
    threshold?: number;
    rootMargin?: string;
    minHeight?: number;
  } = {}
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));

  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoadWrapper
        fallback={options.fallback}
        {...(options.threshold !== undefined && { threshold: options.threshold })}
        {...(options.rootMargin !== undefined && { rootMargin: options.rootMargin })}
        {...(options.minHeight !== undefined && { minHeight: options.minHeight })}
        componentName={Component.displayName || Component.name}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <LazyComponent {...(props as any)} />
      </LazyLoadWrapper>
    );
  };
}

/**
 * Lazy load hook for dynamic imports
 */
export function useLazyLoad<T>(
  importFn: () => Promise<{ default: T }>,
  deps: React.DependencyList = []
) {
  const [component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadedModule = await importFn();

        if (!cancelled) {
          setComponent(loadedModule.default);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load component'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importFn, ...deps]);

  return { component, loading, error };
}

/**
 * Preload component for better UX
 */
export function preloadComponent(importFn: () => Promise<{ default: unknown }>) {
  // Preload on hover or focus
  const preload = () => {
    importFn().catch(() => {
      // Silently fail preloading
    });
  };

  return {
    onMouseEnter: preload,
    onFocus: preload,
  };
}

export default LazyLoadWrapper;
