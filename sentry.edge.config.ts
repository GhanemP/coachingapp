import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env['NODE_ENV'] === 'development',
  
  // Release tracking
  release: process.env['SENTRY_RELEASE'] || 'coaching-app@1.0.0',
  environment: process.env['NODE_ENV'] || 'development',
  
  // Edge runtime specific configuration
  integrations: [
    // Edge runtime has limited integrations available
  ],
  
  // Error filtering for edge runtime
  beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint) {
    // Filter out certain errors in development
    if (process.env['NODE_ENV'] === 'development') {
      return null; // Don't send errors in development for edge runtime
    }
    
    return event;
  },
  
  // Additional tags for better error categorization
  initialScope: {
    tags: {
      component: 'edge',
    },
  },
});