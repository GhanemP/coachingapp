/**
 * Type Safety Utilities
 * Comprehensive utilities for enhanced type safety across the application
 */

// Environment variable utilities with proper typing
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

export function getEnvVarOptional(key: string): string | undefined {
  return process.env[key];
}

export function getEnvVarNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

export function getEnvVarBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value.toLowerCase() === 'true';
}

// Null/undefined safety utilities
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
  return value;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isNotEmpty<T>(value: T[] | null | undefined): value is NonEmptyArray<T> {
  return Array.isArray(value) && value.length > 0;
}

export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}

export function safeGetWithDefault<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  return obj?.[key] ?? defaultValue;
}

// Array utilities
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isDefined);
}

export function findDefined<T>(array: (T | null | undefined)[]): T | undefined {
  return array.find(isDefined);
}

// Object utilities
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function safeObjectAccess<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  path: string
): unknown {
  if (!obj) {
    return undefined;
  }
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

// Error handling utilities
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function toError(value: unknown): Error {
  if (isError(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error('Unknown error occurred');
}

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Async utilities
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Database utilities
export function createSafeDbQuery<T extends Record<string, unknown>>(
  data: Partial<T>
): Record<string, unknown> {
  const safeData: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      safeData[key] = value;
    }
  }
  
  return safeData;
}

export function sanitizeDbInput(input: unknown): unknown {
  if (input === null || input === undefined) {
    return null;
  }
  
  if (typeof input === 'string') {
    return input.trim();
  }
  
  if (typeof input === 'object' && !Array.isArray(input) && !(input instanceof Date)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeDbInput(value);
    }
    return sanitized;
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeDbInput);
  }
  
  return input;
}

// Form data utilities
export function parseFormData(formData: FormData): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  
  for (const [key, value] of formData.entries()) {
    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value.toString());
      } else {
        result[key] = [existing as string, value.toString()];
      }
    } else {
      result[key] = value.toString();
    }
  }
  
  return result;
}

// JSON utilities
export function safeJsonParse<T = unknown>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function safeJsonParseWithDefault<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// Pagination utilities
export function createPaginationParams(
  page: number = 1,
  limit: number = 10,
  maxLimit: number = 100
): { skip: number; take: number; page: number; limit: number } {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(maxLimit, Math.max(1, Math.floor(limit)));
  const skip = (safePage - 1) * safeLimit;
  
  return {
    skip,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
}

// Cache key utilities
export function createCacheKey(...parts: (string | number | boolean)[]): string {
  return parts
    .map(part => String(part))
    .filter(part => part.length > 0)
    .join(':');
}

// Retry utilities
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Sequential retry execution is intentional for retry logic
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (error) {
      lastError = toError(error);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Sequential delay is intentional for retry backoff strategy
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError!;
}

// Export commonly used types
export type SafeAny = unknown;
export type NonEmptyArray<T> = [T, ...T[]];
export type NonNullable<T> = T extends null | undefined ? never : T;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;