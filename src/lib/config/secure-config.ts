/**
 * Secure Configuration Management System
 * 
 * Provides centralized, validated, and type-safe configuration management
 * with security best practices including:
 * - Environment variable validation
 * - Type safety with runtime checks
 * - Sensitive data masking in logs
 * - Configuration caching and hot-reloading
 * - Development vs production environment handling
 */

import { z } from 'zod';

import { logger } from '../logger';

// Configuration validation schemas
const DatabaseConfigSchema = z.object({
  url: z.string().url('Invalid database URL'),
  maxConnections: z.number().min(1).max(100).default(10),
  connectionTimeout: z.number().min(1000).max(30000).default(10000),
  queryTimeout: z.number().min(1000).max(60000).default(30000),
  ssl: z.boolean().default(false),
});

const RedisConfigSchema = z.object({
  host: z.string().min(1, 'Redis host is required'),
  port: z.number().min(1).max(65535).default(6379),
  password: z.string().optional(),
  db: z.number().min(0).max(15).default(0),
  ttl: z.number().min(60).max(86400).default(3600), // 1 hour default
  maxRetries: z.number().min(0).max(10).default(3),
}).optional();

const AuthConfigSchema = z.object({
  secret: z.string().min(32, 'Auth secret must be at least 32 characters'),
  url: z.string().url('Invalid auth URL'),
  sessionMaxAge: z.number().min(300).max(86400).default(3600), // 1 hour default
  csrfProtection: z.boolean().default(true),
  secureCookies: z.boolean().default(true),
});

const GoogleOAuthConfigSchema = z.object({
  clientId: z.string().min(1, 'Google Client ID is required'),
  clientSecret: z.string().min(1, 'Google Client Secret is required'),
}).optional();

const EmailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().min(1).max(65535).default(587),
  user: z.string().email('Invalid SMTP user email'),
  password: z.string().min(1, 'SMTP password is required'),
  from: z.string().email('Invalid from email'),
  secure: z.boolean().default(false),
  tls: z.boolean().default(true),
  resetSubject: z.string().default('Password Reset Request'),
  resetFromName: z.string().default('Coaching App Security'),
}).optional();

const MonitoringConfigSchema = z.object({
  sentryDsn: z.string().url('Invalid Sentry DSN').optional(),
  enableMetrics: z.boolean().default(true),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enablePerformanceTracking: z.boolean().default(true),
}).optional();

const SocketConfigSchema = z.object({
  port: z.number().min(1000).max(65535).default(3002),
  url: z.string().url('Invalid socket URL'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
}).optional();

const AppConfigSchema = z.object({
  name: z.string().default('SmartSource Coaching Hub'),
  version: z.string().default('2.0.0'),
  environment: z.enum(['development', 'production', 'test']),
  port: z.number().min(1000).max(65535).default(3000),
  host: z.string().default('localhost'),
  baseUrl: z.string().url('Invalid base URL'),
});

// Main configuration schema
const ConfigSchema = z.object({
  app: AppConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  auth: AuthConfigSchema,
  googleOAuth: GoogleOAuthConfigSchema,
  email: EmailConfigSchema,
  monitoring: MonitoringConfigSchema,
  socket: SocketConfigSchema,
});

// Configuration types
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type GoogleOAuthConfig = z.infer<typeof GoogleOAuthConfigSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type SocketConfig = z.infer<typeof SocketConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type SecureConfig = z.infer<typeof ConfigSchema>;

// Sensitive field patterns for masking
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /dsn/i,
];

// Configuration loader class
class SecureConfigManager {
  private config: SecureConfig | null = null;
  private isLoaded = false;
  private loadError: Error | null = null;

  /**
   * Load and validate configuration from environment variables
   */
  load(): SecureConfig {
    if (this.isLoaded && this.config) {
      return this.config;
    }

    if (this.loadError) {
      throw this.loadError;
    }

    try {
      const rawConfig = this.loadFromEnvironment();
      const validatedConfig = ConfigSchema.parse(rawConfig);
      
      this.config = validatedConfig;
      this.isLoaded = true;
      
      logger.info('Configuration loaded successfully', {
        metadata: {
          environment: validatedConfig.app.environment,
          hasRedis: !!validatedConfig.redis,
          hasGoogleOAuth: !!validatedConfig.googleOAuth,
          hasEmail: !!validatedConfig.email,
          hasMonitoring: !!validatedConfig.monitoring,
          hasSocket: !!validatedConfig.socket,
        }
      });

      return validatedConfig;
    } catch (error) {
      this.loadError = error instanceof Error ? error : new Error('Configuration load failed');
      logger.error('Configuration validation failed', this.loadError);
      throw this.loadError;
    }
  }

  /**
   * Reload configuration (useful for hot-reloading in development)
   */
  reload(): SecureConfig {
    this.config = null;
    this.isLoaded = false;
    this.loadError = null;
    return this.load();
  }

  /**
   * Get configuration with optional path
   */
  get(): SecureConfig;
  get<K extends keyof SecureConfig>(path: K): SecureConfig[K];
  get<K extends keyof SecureConfig>(path?: K): SecureConfig | SecureConfig[K] {
    const config = this.load();
    if (path) {
      return config[path];
    }
    return config;
  }

  /**
   * Check if configuration is valid without throwing
   */
  isValid(): boolean {
    try {
      this.load();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get masked configuration for logging (sensitive data hidden)
   */
  getMaskedConfig(): Record<string, unknown> {
    try {
      const config = this.load();
      return this.maskSensitiveData(config) as Record<string, unknown>;
    } catch {
      return { error: 'Configuration not loaded' };
    }
  }

  /**
   * Load raw configuration from environment variables
   */
  private loadFromEnvironment(): unknown {
    const env = process.env;
    
    return {
      app: {
        name: env.APP_NAME || 'SmartSource Coaching Hub',
        version: env.APP_VERSION || '2.0.0',
        environment: env.NODE_ENV || 'development',
        port: env.PORT ? parseInt(env.PORT, 10) : 3000,
        host: env.HOST || 'localhost',
        baseUrl: env.NEXTAUTH_URL || 'http://localhost:3000',
      },
      database: {
        url: env.DATABASE_URL,
        maxConnections: env.DB_MAX_CONNECTIONS ? parseInt(env.DB_MAX_CONNECTIONS, 10) : 10,
        connectionTimeout: env.DB_CONNECTION_TIMEOUT ? parseInt(env.DB_CONNECTION_TIMEOUT, 10) : 10000,
        queryTimeout: env.DB_QUERY_TIMEOUT ? parseInt(env.DB_QUERY_TIMEOUT, 10) : 30000,
        ssl: env.DB_SSL === 'true',
      },
      redis: env.REDIS_HOST ? {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : 6379,
        password: env.REDIS_PASSWORD || undefined,
        db: env.REDIS_DB ? parseInt(env.REDIS_DB, 10) : 0,
        ttl: env.REDIS_TTL ? parseInt(env.REDIS_TTL, 10) : 3600,
        maxRetries: env.REDIS_MAX_RETRIES ? parseInt(env.REDIS_MAX_RETRIES, 10) : 3,
      } : undefined,
      auth: {
        secret: env.NEXTAUTH_SECRET,
        url: env.NEXTAUTH_URL,
        sessionMaxAge: env.SESSION_MAX_AGE ? parseInt(env.SESSION_MAX_AGE, 10) : 3600,
        csrfProtection: env.CSRF_PROTECTION !== 'false',
        secureCookies: env.NODE_ENV === 'production',
      },
      googleOAuth: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      } : undefined,
      email: env.SMTP_HOST ? {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.SMTP_FROM,
        secure: env.SMTP_SECURE === 'true',
        tls: env.SMTP_TLS !== 'false',
        resetSubject: env.EMAIL_RESET_SUBJECT || 'Password Reset Request',
        resetFromName: env.EMAIL_RESET_FROM_NAME || 'Coaching App Security',
      } : undefined,
      monitoring: env.SENTRY_DSN || env.LOG_LEVEL ? {
        sentryDsn: env.SENTRY_DSN || undefined,
        enableMetrics: env.ENABLE_METRICS !== 'false',
        logLevel: env.LOG_LEVEL || 'info',
        enablePerformanceTracking: env.ENABLE_PERFORMANCE_TRACKING !== 'false',
      } : undefined,
      socket: env.SOCKET_PORT || env.NEXT_PUBLIC_SOCKET_URL ? {
        port: env.SOCKET_PORT ? parseInt(env.SOCKET_PORT, 10) : 3002,
        url: env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002',
        corsOrigins: env.SOCKET_CORS_ORIGINS ? env.SOCKET_CORS_ORIGINS.split(',') : ['http://localhost:3000'],
      } : undefined,
    };
  }

  /**
   * Recursively mask sensitive data in configuration
   */
  private maskSensitiveData(obj: unknown, path = ''): unknown {
    if (typeof obj !== 'object' || obj === null) {
      // Check if this field should be masked
      const shouldMask = SENSITIVE_PATTERNS.some(pattern => pattern.test(path));
      return shouldMask ? '***MASKED***' : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.maskSensitiveData(item, `${path}[${index}]`));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      result[key] = this.maskSensitiveData(value, newPath);
    }
    return result;
  }
}

// Global configuration manager instance
const configManager = new SecureConfigManager();

// Convenience functions
export const loadConfig = (): SecureConfig => configManager.load();
export const reloadConfig = (): SecureConfig => configManager.reload();
export const getConfig = (): SecureConfig => configManager.get();
export const getConfigSection = <K extends keyof SecureConfig>(path: K): SecureConfig[K] => configManager.get(path);
export const isConfigValid = (): boolean => configManager.isValid();
export const getMaskedConfig = (): Record<string, unknown> => configManager.getMaskedConfig();

// Environment-specific helpers
export const isDevelopment = (): boolean => {
  try {
    return getConfigSection('app').environment === 'development';
  } catch {
    return process.env.NODE_ENV === 'development';
  }
};

export const isProduction = (): boolean => {
  try {
    return getConfigSection('app').environment === 'production';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
};

export const isTest = (): boolean => {
  try {
    return getConfigSection('app').environment === 'test';
  } catch {
    return process.env.NODE_ENV === 'test';
  }
};

// Configuration validation on module load
if (typeof window === 'undefined') {
  // Only validate on server-side
  try {
    configManager.load();
  } catch (error) {
    logger.error('Failed to load configuration on startup', error as Error);
    if (isProduction()) {
      // In production, fail fast if configuration is invalid
      process.exit(1);
    }
  }
}

export default configManager;