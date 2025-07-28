// Global type definitions for enhanced type safety

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test';
      readonly NEXTAUTH_SECRET: string;
      readonly NEXTAUTH_URL: string;
      readonly DATABASE_URL: string;
      readonly REDIS_URL?: string;
      readonly SENTRY_DSN?: string;
      readonly GOOGLE_CLIENT_ID?: string;
      readonly GOOGLE_CLIENT_SECRET?: string;
    }
  }

  // Extend Window interface for client-side globals
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }

  // Custom utility types
  type NonEmptyArray<T> = [T, ...T[]];
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
  };
  type Prettify<T> = {
    [K in keyof T]: T[K];
  } & Record<string, never>;

  // Database-related types
  type DatabaseRecord = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  };

  // API Response types
  type ApiSuccess<T = unknown> = {
    success: true;
    data: T;
    message?: string;
  };

  type ApiError = {
    success: false;
    error: string;
    code?: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };

  type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

  // Form-related types
  type FormState<T = Record<string, unknown>> = {
    data: T;
    errors: Partial<Record<keyof T, string>>;
    isSubmitting: boolean;
    isValid: boolean;
  };

  // Authentication types
  type UserRole = 'ADMIN' | 'MANAGER' | 'TEAM_LEADER' | 'AGENT';

  type AuthUser = {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    isActive: boolean;
  };

  // Component prop types
  type PropsWithClassName<T = Record<string, never>> = T & {
    className?: string;
  };

  type PropsWithChildren<T = Record<string, never>> = T & {
    children: React.ReactNode;
  };

  // Event handler types
  type EventHandler<T = Event> = (event: T) => void;
  type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

  // Pagination types
  type PaginationParams = {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };

  type PaginatedResponse<T> = {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };

  // Filter types
  type FilterOperator =
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'startsWith'
    | 'endsWith';

  type Filter<T = unknown> = {
    field: string;
    operator: FilterOperator;
    value: T;
  };

  // Date range types
  type DateRange = {
    start: Date;
    end: Date;
  };

  // Status types
  type Status = 'active' | 'inactive' | 'pending' | 'archived';
  type Priority = 'low' | 'medium' | 'high' | 'critical';

  // Notification types
  type NotificationType = 'info' | 'success' | 'warning' | 'error';

  type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  };

  // File upload types
  type FileUpload = {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
  };

  // Theme types
  type Theme = 'light' | 'dark' | 'system';

  // Locale types
  type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

  // Metrics types
  type MetricValue = number | string | boolean | Date;

  type Metric = {
    name: string;
    value: MetricValue;
    unit?: string;
    timestamp: Date;
    tags?: Record<string, string>;
  };

  // Cache types
  type CacheEntry<T = unknown> = {
    data: T;
    timestamp: Date;
    ttl: number;
  };

  // Validation types
  type ValidationRule<T = unknown> = {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: T) => boolean | string;
  };

  type ValidationSchema<T = Record<string, unknown>> = {
    [K in keyof T]?: ValidationRule<T[K]>;
  };

  // Socket types
  type SocketEvent<T = unknown> = {
    type: string;
    payload: T;
    timestamp: Date;
  };

  // Error types
  type AppError = {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
    stack?: string;
    cause?: unknown;
  };

  // Configuration types
  type AppConfig = {
    app: {
      name: string;
      version: string;
      environment: string;
    };
    database: {
      url: string;
      maxConnections: number;
    };
    redis?: {
      url: string;
      ttl: number;
    };
    auth: {
      secret: string;
      sessionMaxAge: number;
    };
    monitoring?: {
      sentryDsn: string;
      enableMetrics: boolean;
    };
  };
}

export {};
