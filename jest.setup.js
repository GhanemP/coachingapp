import '@testing-library/jest-dom';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated'
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }
}), { virtual: true });

// Mock Redis
jest.mock('@/lib/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  invalidateCache: jest.fn(),
  invalidateAgentCache: jest.fn(),
  CACHE_KEYS: {
    USER: 'user:',
    SESSION: 'session:',
    AGENT_METRICS: 'agent_metrics:',
    QUICK_NOTES: 'quick_notes:',
    ACTION_ITEMS: 'action_items:',
    ACTION_PLANS: 'action_plans:',
    NOTIFICATIONS: 'notifications:',
  },
  CACHE_TTL: {
    SHORT: 300,
    MEDIUM: 1800,
    LONG: 3600,
    DAY: 86400,
  },
}), { virtual: true });

// Mock Socket.io
jest.mock('@/hooks/use-socket', () => ({
  useSocket: jest.fn(() => ({
    socket: null,
    isConnected: false,
  })),
}), { virtual: true });

// Mock auth server
jest.mock('@/lib/auth-server', () => ({
  getSession: jest.fn(),
}), { virtual: true });

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}), { virtual: true });

// Mock socket helpers
jest.mock('@/lib/socket-helpers', () => ({
  notifyQuickNoteCreated: jest.fn(),
}), { virtual: true });

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia only in jsdom environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
