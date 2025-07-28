import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { UserRole } from '@/lib/constants';

// Standard API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse extends ApiResponse {
  error: string;
  details?: ValidationError[];
  code?: string;
}

// Request Context
export interface RequestContext {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string | null;
  };
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
}

// Route Handler Types
export type ApiHandler = (
  request: NextRequest,
  context: RequestContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

export type RouteConfig = {
  auth?: boolean;
  roles?: UserRole[];
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  cache?: {
    ttl: number; // in milliseconds
    key?: (context: RequestContext, params?: Record<string, unknown>) => string;
  };
};

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Standard Error Codes
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
}

// Standard HTTP Status Codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}
