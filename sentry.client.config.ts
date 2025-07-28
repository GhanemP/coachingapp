// Sentry Client Configuration
// This file is conditionally loaded only when Sentry is available

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs');

  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    debug: process.env['NODE_ENV'] === 'development',
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration({
        instrumentNavigation: true,
        instrumentPageLoad: true,
      }),
    ],

    profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    release: process.env['SENTRY_RELEASE'] || 'coaching-app@1.0.0',
    environment: process.env['NODE_ENV'] || 'development',

    beforeSend(event: { exception?: { values?: Array<{ value?: string; type?: string }> } }) {
      if (process.env['NODE_ENV'] === 'development') {
        if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }
      }

      if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
        return null;
      }

      return event;
    },

    initialScope: {
      tags: {
        component: 'client',
      },
    },
  });
} catch {
  console.log('Sentry not available, skipping client configuration');
}
