# Secure Configuration Management

This module provides a centralized, validated, and type-safe configuration management system for the SmartSource Coaching Hub application.

## Features

- ✅ **Environment Variable Validation** - Validates all configuration at startup
- ✅ **Type Safety** - Full TypeScript support with runtime validation using Zod
- ✅ **Sensitive Data Masking** - Automatically masks passwords, secrets, and keys in logs
- ✅ **Configuration Caching** - Loads once and caches for performance
- ✅ **Hot Reloading** - Supports configuration reloading in development
- ✅ **Environment Detection** - Built-in helpers for development/production/test environments
- ✅ **Fail-Fast Validation** - Application exits on invalid configuration in production

## Usage

### Basic Configuration Access

```typescript
import { getConfig, getConfigSection } from '@/lib/config/secure-config';

// Get entire configuration
const config = getConfig();

// Get specific section
const dbConfig = getConfigSection('database');
const authConfig = getConfigSection('auth');
```

### Environment Helpers

```typescript
import { isDevelopment, isProduction, isTest } from '@/lib/config/secure-config';

if (isDevelopment()) {
  console.log('Running in development mode');
}

if (isProduction()) {
  // Enable production optimizations
}
```

### Configuration Validation

```typescript
import { isConfigValid, getMaskedConfig } from '@/lib/config/secure-config';

// Check if configuration is valid
if (!isConfigValid()) {
  console.error('Configuration is invalid');
  process.exit(1);
}

// Get masked configuration for logging
console.log('Configuration:', getMaskedConfig());
```

## Configuration Sections

### App Configuration
```typescript
const appConfig = getConfigSection('app');
// {
//   name: string;
//   version: string;
//   environment: 'development' | 'production' | 'test';
//   port: number;
//   host: string;
//   baseUrl: string;
// }
```

### Database Configuration
```typescript
const dbConfig = getConfigSection('database');
// {
//   url: string;
//   maxConnections: number;
//   connectionTimeout: number;
//   queryTimeout: number;
//   ssl: boolean;
// }
```

### Authentication Configuration
```typescript
const authConfig = getConfigSection('auth');
// {
//   secret: string;
//   url: string;
//   sessionMaxAge: number;
//   csrfProtection: boolean;
//   secureCookies: boolean;
// }
```

### Optional Configurations

#### Redis Configuration
```typescript
const redisConfig = getConfigSection('redis'); // May be undefined
if (redisConfig) {
  // Redis is configured
  console.log(`Redis: ${redisConfig.host}:${redisConfig.port}`);
}
```

#### Email Configuration
```typescript
const emailConfig = getConfigSection('email'); // May be undefined
if (emailConfig) {
  // Email is configured
  console.log(`SMTP: ${emailConfig.host}:${emailConfig.port}`);
}
```

## Environment Variables

### Required Variables

```bash
# Database (Required)
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Authentication (Required)
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Application
NODE_ENV="development" # development | production | test
```

### Optional Variables

```bash
# Redis (Optional - graceful fallback)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@yourdomain.com"

# Monitoring (Optional)
SENTRY_DSN="https://your-sentry-dsn"
LOG_LEVEL="info" # error | warn | info | debug

# Socket.io (Optional)
SOCKET_PORT="3002"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3002"
```

## Security Features

### Sensitive Data Masking

The configuration system automatically masks sensitive data in logs:

```typescript
import { getMaskedConfig } from '@/lib/config/secure-config';

console.log(getMaskedConfig());
// Output:
// {
//   auth: {
//     secret: "***MASKED***",
//     url: "http://localhost:3000"
//   },
//   database: {
//     url: "***MASKED***"
//   }
// }
```

### Validation Rules

- **Database URL**: Must be a valid PostgreSQL connection string
- **Auth Secret**: Must be at least 32 characters long
- **Email**: Must be valid email addresses
- **Ports**: Must be valid port numbers (1-65535)
- **URLs**: Must be valid HTTP/HTTPS URLs

### Production Security

In production mode:
- Application exits immediately if configuration is invalid
- Secure cookies are enabled by default
- CSRF protection is enabled by default
- SSL is recommended for database connections

## Error Handling

```typescript
import { loadConfig } from '@/lib/config/secure-config';

try {
  const config = loadConfig();
  console.log('Configuration loaded successfully');
} catch (error) {
  console.error('Configuration error:', error.message);
  // Application will exit in production
}
```

## Hot Reloading (Development)

```typescript
import { reloadConfig } from '@/lib/config/secure-config';

// Reload configuration (useful for development)
const newConfig = reloadConfig();
console.log('Configuration reloaded');
```

## Migration from Environment Variables

### Before (Direct Environment Access)
```typescript
// ❌ Not recommended
const dbUrl = process.env.DATABASE_URL;
const port = parseInt(process.env.PORT || '3000');
```

### After (Secure Configuration)
```typescript
// ✅ Recommended
import { getConfigSection } from '@/lib/config/secure-config';

const dbConfig = getConfigSection('database');
const appConfig = getConfigSection('app');

const dbUrl = dbConfig.url; // Validated and type-safe
const port = appConfig.port; // Validated and type-safe
```

## Benefits

1. **Type Safety**: Full TypeScript support with runtime validation
2. **Security**: Automatic masking of sensitive data in logs
3. **Reliability**: Fail-fast validation prevents runtime errors
4. **Maintainability**: Centralized configuration management
5. **Developer Experience**: Clear error messages and validation
6. **Performance**: Configuration caching and lazy loading
7. **Flexibility**: Support for optional configurations with graceful fallbacks

## Best Practices

1. **Always use the configuration system** instead of direct `process.env` access
2. **Validate configuration early** in your application startup
3. **Use environment-specific helpers** for conditional logic
4. **Never log raw configuration** - use `getMaskedConfig()` instead
5. **Set appropriate defaults** for optional configurations
6. **Use strong secrets** (at least 32 characters) in production
7. **Enable SSL** for database connections in production