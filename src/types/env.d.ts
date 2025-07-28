declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    LOG_LEVEL?: string;
    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_PASSWORD?: string;
    REDIS_DB?: string;
    NEXT_PUBLIC_SOCKET_URL?: string;
    DATABASE_CONNECTION_LIMIT?: string;
    DATABASE_CONNECT_TIMEOUT?: string;
    DATABASE_POOL_TIMEOUT?: string;
    DATABASE_MAX_LIFETIME?: string;
    DATABASE_IDLE_TIMEOUT?: string;
    SENTRY_DSN?: string;
    SENTRY_ORG?: string;
    SENTRY_PROJECT?: string;
    ANALYZE?: string;
  }
}
