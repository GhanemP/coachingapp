// Fallback Sentry implementation when @sentry/nextjs is not available
// This provides the same interface but with no-op implementations

export interface SentryEvent {
  exception?: {
    values?: Array<{
      value?: string;
      type?: string;
    }>;
  };
  transaction?: string;
}

export interface SentryEventHint {
  originalException?: Error;
}

export interface SentryScope {
  setUser(user: { id: string }): void;
  setTag(key: string, value: string): void;
  setExtra(key: string, value: unknown): void;
  setLevel(level: string): void;
  level?: string;
}

export interface SentryBreadcrumb {
  message: string;
  category: string;
  level: string;
  data?: Record<string, unknown>;
}

// No-op implementations
const noOpScope: SentryScope = {
  setUser: () => {},
  setTag: () => {},
  setExtra: () => {},
  setLevel: () => {},
};

export const Sentry = {
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  withScope: (callback: (scope: SentryScope) => void) => {
    callback(noOpScope);
  },
  addBreadcrumb: () => {},
  replayIntegration: () => ({}),
  browserTracingIntegration: () => ({}),
  httpIntegration: () => ({}),
  prismaIntegration: () => ({}),
};

export default Sentry;