/**
 * Frontend Performance Monitoring System
 *
 * This module provides comprehensive frontend performance monitoring including:
 * - Core Web Vitals tracking (LCP, FID, CLS, FCP, TTFB)
 * - Component render performance monitoring
 * - Bundle size analysis and optimization
 * - Memory usage tracking
 * - Network performance monitoring
 * - User interaction performance
 *
 * @version 1.0.0
 * @author SmartSource Coaching Hub
 */

import React from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals';

import logger from './logger';

// Declare gtag for Google Analytics
declare global {
  function gtag(...args: unknown[]): void;
}

// Performance thresholds based on Google's Core Web Vitals
const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (LCP)
  LCP: {
    GOOD: 2500, // <= 2.5s
    NEEDS_IMPROVEMENT: 4000, // 2.5s - 4s
    POOR: Infinity, // > 4s
  },
  // First Input Delay (FID)
  FID: {
    GOOD: 100, // <= 100ms
    NEEDS_IMPROVEMENT: 300, // 100ms - 300ms
    POOR: Infinity, // > 300ms
  },
  // Cumulative Layout Shift (CLS)
  CLS: {
    GOOD: 0.1, // <= 0.1
    NEEDS_IMPROVEMENT: 0.25, // 0.1 - 0.25
    POOR: Infinity, // > 0.25
  },
  // First Contentful Paint (FCP)
  FCP: {
    GOOD: 1800, // <= 1.8s
    NEEDS_IMPROVEMENT: 3000, // 1.8s - 3s
    POOR: Infinity, // > 3s
  },
  // Time to First Byte (TTFB)
  TTFB: {
    GOOD: 800, // <= 800ms
    NEEDS_IMPROVEMENT: 1800, // 800ms - 1.8s
    POOR: Infinity, // > 1.8s
  },
} as const;

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  navigationType?: string;
}

// Component performance tracking
interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  mountTime?: number;
  updateTime?: number;
  unmountTime?: number;
  propsSize?: number;
  childrenCount?: number;
}

// Network performance tracking
interface NetworkPerformance {
  url: string;
  method: string;
  duration: number;
  size: number;
  status: number;
  type: 'fetch' | 'xhr' | 'navigation' | 'resource';
  timestamp: number;
}

// Memory usage tracking
interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

/**
 * Performance Monitor Class
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: ComponentPerformance[] = [];
  private networkMetrics: NetworkPerformance[] = [];
  private memoryMetrics: MemoryUsage[] = [];
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;
  private memoryTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;
    this.setupCoreWebVitals();
    this.setupResourceObserver();
    this.setupNavigationObserver();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();

    logger.info('Performance monitoring initialized', {
      metadata: {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        connection: this.getConnectionInfo(),
      },
    });
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupCoreWebVitals(): void {
    // Largest Contentful Paint
    onLCP((metric: Metric) => {
      this.recordMetric({
        name: 'LCP',
        value: metric.value,
        rating: this.getRating('LCP', metric.value),
        timestamp: Date.now(),
        id: metric.id,
        navigationType: (metric as unknown as Record<string, unknown>).navigationType as string,
      });
    });

    // Interaction to Next Paint (replaces FID in web-vitals v5)
    onINP((metric: Metric) => {
      this.recordMetric({
        name: 'INP',
        value: metric.value,
        rating: this.getRating('FID', metric.value), // Use FID thresholds for INP
        timestamp: Date.now(),
        id: metric.id,
        navigationType: (metric as unknown as Record<string, unknown>).navigationType as string,
      });
    });

    // Cumulative Layout Shift
    onCLS((metric: Metric) => {
      this.recordMetric({
        name: 'CLS',
        value: metric.value,
        rating: this.getRating('CLS', metric.value),
        timestamp: Date.now(),
        id: metric.id,
        navigationType: (metric as unknown as Record<string, unknown>).navigationType as string,
      });
    });

    // First Contentful Paint
    onFCP((metric: Metric) => {
      this.recordMetric({
        name: 'FCP',
        value: metric.value,
        rating: this.getRating('FCP', metric.value),
        timestamp: Date.now(),
        id: metric.id,
        navigationType: (metric as unknown as Record<string, unknown>).navigationType as string,
      });
    });

    // Time to First Byte
    onTTFB((metric: Metric) => {
      this.recordMetric({
        name: 'TTFB',
        value: metric.value,
        rating: this.getRating('TTFB', metric.value),
        timestamp: Date.now(),
        id: metric.id,
        navigationType: (metric as unknown as Record<string, unknown>).navigationType as string,
      });
    });
  }

  /**
   * Setup resource performance observer
   */
  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordNetworkMetric({
            url: resourceEntry.name,
            method: 'GET',
            duration: resourceEntry.duration,
            size: resourceEntry.transferSize || 0,
            status: 200, // Assume success for resources
            type: 'resource',
            timestamp: Date.now(),
          });
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  /**
   * Setup navigation performance observer
   */
  private setupNavigationObserver(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;

          // Record navigation timing metrics
          this.recordMetric({
            name: 'DOM_CONTENT_LOADED',
            value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            rating:
              navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart < 1000
                ? 'good'
                : 'needs-improvement',
            timestamp: Date.now(),
            id: 'navigation',
          });

          this.recordMetric({
            name: 'LOAD_EVENT',
            value: navEntry.loadEventEnd - navEntry.loadEventStart,
            rating:
              navEntry.loadEventEnd - navEntry.loadEventStart < 1000 ? 'good' : 'needs-improvement',
            timestamp: Date.now(),
            id: 'navigation',
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
    this.observers.push(observer);
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) {
      return;
    }

    const recordMemory = () => {
      const memory = (
        performance as unknown as {
          memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      this.recordMemoryUsage({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      });
    };

    // Record memory usage every 30 seconds with proper cleanup
    recordMemory();
    this.memoryTimer = setInterval(recordMemory, 30000);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        this.recordNetworkMetric({
          url,
          method,
          duration,
          size: parseInt(response.headers.get('content-length') || '0'),
          status: response.status,
          type: 'fetch',
          timestamp: Date.now(),
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.recordNetworkMetric({
          url,
          method,
          duration,
          size: 0,
          status: 0,
          type: 'fetch',
          timestamp: Date.now(),
        });

        throw error;
      }
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log poor performance
    if (metric.rating === 'poor') {
      logger.warn(`Poor ${metric.name} performance detected`, {
        metadata: {
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
          threshold: this.getThreshold(metric.name, 'POOR'),
        },
      });
    }

    // Send to analytics (if configured)
    this.sendToAnalytics(metric);
  }

  /**
   * Record component performance
   */
  recordComponentPerformance(componentMetric: ComponentPerformance): void {
    this.componentMetrics.push(componentMetric);

    // Keep only last 50 component metrics
    if (this.componentMetrics.length > 50) {
      this.componentMetrics = this.componentMetrics.slice(-50);
    }

    // Log slow component renders
    if (componentMetric.renderTime > 16) {
      // 60fps threshold
      logger.warn('Slow component render detected', {
        metadata: {
          component: componentMetric.componentName,
          renderTime: componentMetric.renderTime,
          propsSize: componentMetric.propsSize,
          childrenCount: componentMetric.childrenCount,
        },
      });
    }
  }

  /**
   * Record network performance
   */
  private recordNetworkMetric(networkMetric: NetworkPerformance): void {
    this.networkMetrics.push(networkMetric);

    // Keep only last 50 network metrics
    if (this.networkMetrics.length > 50) {
      this.networkMetrics = this.networkMetrics.slice(-50);
    }

    // Log slow network requests
    if (networkMetric.duration > 2000) {
      logger.warn('Slow network request detected', {
        url: networkMetric.url,
        method: networkMetric.method,
        duration: networkMetric.duration,
        metadata: {
          status: networkMetric.status.toString(),
          size: networkMetric.size,
        },
      });
    }
  }

  /**
   * Record memory usage
   */
  private recordMemoryUsage(memoryUsage: MemoryUsage): void {
    this.memoryMetrics.push(memoryUsage);

    // Keep only last 20 memory metrics (10 minutes of data)
    if (this.memoryMetrics.length > 20) {
      this.memoryMetrics = this.memoryMetrics.slice(-20);
    }

    // Log high memory usage
    const usagePercentage = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
    if (usagePercentage > 80) {
      logger.warn('High memory usage detected', {
        metadata: {
          usagePercentage: usagePercentage.toFixed(2),
          usedJSHeapSize: memoryUsage.usedJSHeapSize,
          jsHeapSizeLimit: memoryUsage.jsHeapSizeLimit,
        },
      });
    }
  }

  /**
   * Get performance rating for a metric
   */
  private getRating(
    metricName: keyof typeof PERFORMANCE_THRESHOLDS,
    value: number
  ): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = PERFORMANCE_THRESHOLDS[metricName];

    if (value <= thresholds.GOOD) {
      return 'good';
    } else if (value <= thresholds.NEEDS_IMPROVEMENT) {
      return 'needs-improvement';
    } else {
      return 'poor';
    }
  }

  /**
   * Get threshold value for a metric
   */
  private getThreshold(metricName: string, level: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR'): number {
    const thresholds = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    return thresholds?.[level] || 0;
  }

  /**
   * Get connection information
   */
  private getConnectionInfo(): {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } | null {
    const connection =
      (
        navigator as {
          connection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
          mozConnection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
          webkitConnection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).connection ||
      (
        navigator as {
          mozConnection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).mozConnection ||
      (
        navigator as {
          webkitConnection?: {
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
          };
        }
      ).webkitConnection;

    if (!connection) {
      return null;
    }

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }

  /**
   * Send metric to analytics
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Send to Google Analytics, Sentry, or other analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: {
          metric_rating: metric.rating,
        },
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    coreWebVitals: Record<string, PerformanceMetric | undefined>;
    componentPerformance: ComponentPerformance[];
    networkPerformance: NetworkPerformance[];
    memoryUsage: MemoryUsage | undefined;
    overallScore: number;
  } {
    const coreWebVitals = {
      LCP: this.metrics.find(m => m.name === 'LCP'),
      FID: this.metrics.find(m => m.name === 'FID'),
      CLS: this.metrics.find(m => m.name === 'CLS'),
      FCP: this.metrics.find(m => m.name === 'FCP'),
      TTFB: this.metrics.find(m => m.name === 'TTFB'),
    };

    // Calculate overall performance score (0-100)
    const scores = Object.values(coreWebVitals)
      .filter(Boolean)
      .map(metric => {
        switch (metric!.rating) {
          case 'good':
            return 100;
          case 'needs-improvement':
            return 60;
          case 'poor':
            return 20;
          default:
            return 0;
        }
      });

    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length)
        : 0;

    return {
      coreWebVitals,
      componentPerformance: this.componentMetrics.slice(-10),
      networkPerformance: this.networkMetrics.slice(-10),
      memoryUsage: this.memoryMetrics[this.memoryMetrics.length - 1],
      overallScore,
    };
  }

  /**
   * Cleanup observers and timers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear memory monitoring timer
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }

    this.isInitialized = false;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for component performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();

  return {
    recordRender: (propsSize?: number, childrenCount?: number) => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordComponentPerformance({
        componentName,
        renderTime,
        ...(propsSize !== undefined && { propsSize }),
        ...(childrenCount !== undefined && { childrenCount }),
      });
    },
  };
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName =
    componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  return function PerformanceMonitoredComponent(props: P) {
    const { recordRender } = usePerformanceMonitor(displayName);

    React.useEffect(() => {
      recordRender(
        JSON.stringify(props).length,
        React.Children.count((props as { children?: React.ReactNode }).children)
      );
    });

    return React.createElement(WrappedComponent, props);
  };
}

// Initialize performance monitoring when module loads
if (typeof window !== 'undefined') {
  // Wait for page load to avoid interfering with initial performance
  if (document.readyState === 'complete') {
    performanceMonitor.init();
  } else {
    window.addEventListener('load', () => {
      performanceMonitor.init();
    });
  }
}

export default performanceMonitor;
