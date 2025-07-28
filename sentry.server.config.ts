import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env['NODE_ENV'] === 'development',

  // Performance monitoring
  profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

  // Release tracking
  release: process.env['SENTRY_RELEASE'] || 'coaching-app@1.0.0',
  environment: process.env['NODE_ENV'] || 'development',

  // Server-specific integrations
  integrations: [Sentry.httpIntegration(), Sentry.prismaIntegration()],

  // Error filtering for server-side
  beforeSend(event, _hint) {
    // Filter out certain errors in development
    if (process.env['NODE_ENV'] === 'development') {
      // Don't send certain development-only errors
      if (event.exception?.values?.[0]?.value?.includes('ECONNREFUSED')) {
        return null;
      }
    }

    // Filter out expected errors
    if (event.exception?.values?.[0]?.type === 'NotFoundError') {
      return null;
    }

    return event;
  },

  // Additional tags for better error categorization
  initialScope: {
    tags: {
      component: 'server',
    },
  },

  // Custom error boundaries
  beforeSendTransaction(event) {
    // Filter out health check transactions
    if (event.transaction?.includes('/api/health')) {
      return null;
    }

    return event;
  },
});
