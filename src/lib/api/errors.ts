import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import logger from '@/lib/logger';

import {
  ApiErrorResponse,
  ApiErrorCode,
  HttpStatus,
  ValidationError as ValidationErrorType,
} from './types';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: ValidationErrorType[];

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
    details?: ValidationErrorType[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: ValidationErrorType[]) {
    super(message, HttpStatus.BAD_REQUEST, ApiErrorCode.VALIDATION_ERROR, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ApiErrorCode.RATE_LIMITED);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, HttpStatus.CONFLICT, ApiErrorCode.CONFLICT);
  }
}

export function createErrorResponse(
  error: unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const timestamp = new Date().toISOString();

  // Handle known API errors
  if (error instanceof ApiError) {
    const response: ApiErrorResponse = {
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      requestId,
    };

    logger.warn('API Error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId,
      stack: error.stack,
    });

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors: ValidationErrorType[] = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const response: ApiErrorResponse = {
      error: 'Validation failed',
      code: ApiErrorCode.VALIDATION_ERROR,
      details: validationErrors,
      timestamp,
      requestId,
    };

    logger.warn('Validation Error:', {
      errors: validationErrors,
      requestId,
    });

    return NextResponse.json(response, { status: HttpStatus.BAD_REQUEST });
  }

  // Handle unknown errors
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  const response: ApiErrorResponse = {
    error: 'Internal server error',
    code: ApiErrorCode.INTERNAL_ERROR,
    timestamp,
    requestId,
  };

  logger.error('Unhandled API Error:', error as Error, {
    message: errorMessage,
    requestId,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(response, { status: HttpStatus.INTERNAL_SERVER_ERROR });
}

export function createSuccessResponse<T>(
  data: T,
  status: number = HttpStatus.OK,
  message?: string,
  requestId?: string
): NextResponse {
  const response = {
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return NextResponse.json(response, { status });
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  requestId?: string
): NextResponse {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const response = {
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  return NextResponse.json(response, { status: HttpStatus.OK });
}
