// Client-side logger that only uses console
const logger = {
  error: (message: string, meta?: unknown) => {
    if (typeof window !== 'undefined') {
      console.error(message, meta);
    }
  },
  warn: (message: string, meta?: unknown) => {
    if (typeof window !== 'undefined') {
      console.warn(message, meta);
    }
  },
  info: (message: string, meta?: unknown) => {
    if (typeof window !== 'undefined') {
      console.log(message, meta);
    }
  },
  http: (message: string, meta?: unknown) => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.log(message, meta);
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug(message, meta);
    }
  },
  logError: (error: Error, context?: string) => {
    if (typeof window !== 'undefined') {
      console.error(context || 'An error occurred', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
  },
};

export default logger;