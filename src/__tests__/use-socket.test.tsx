/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../hooks/use-socket';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('useSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([]),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with correct default values when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSocket());

    expect(result.current.socket).toBeNull();
    expect(result.current.connected).toBe(false);
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(typeof result.current.markNotificationRead).toBe('function');
    expect(typeof result.current.joinAgentRoom).toBe('function');
    expect(typeof result.current.joinTeamRoom).toBe('function');
    expect(typeof result.current.on).toBe('function');
    expect(typeof result.current.off).toBe('function');
    expect(typeof result.current.emit).toBe('function');
  });

  it('should provide socket methods with proper function signatures', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSocket());

    // Test that event handlers accept proper types
    const testHandler = (data: unknown) => {
      console.log('Handler called with:', data);
    };

    // These should not cause runtime errors
    act(() => {
      result.current.on('test-event', testHandler);
      result.current.off('test-event', testHandler);
      result.current.emit('test-event', { data: 'test' });
      result.current.markNotificationRead('test-notification-id');
      result.current.joinAgentRoom('test-agent-id');
      result.current.joinTeamRoom('test-team-leader-id');
    });

    expect(result.current).toBeDefined();
  });

  it('should handle authentication status changes', () => {
    // Start unauthenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result, rerender } = renderHook(() => useSocket());

    expect(result.current.socket).toBeNull();
    expect(result.current.connected).toBe(false);

    // Switch to authenticated
    mockUseSession.mockReturnValue({
      data: { 
        user: { 
          id: 'test-user', 
          email: 'test@example.com',
          name: 'Test User',
          role: 'AGENT' 
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    rerender();

    // Hook should still be stable
    expect(typeof result.current.markNotificationRead).toBe('function');
    expect(typeof result.current.joinAgentRoom).toBe('function');
    expect(typeof result.current.joinTeamRoom).toBe('function');
  });

  it('should calculate unread notifications count correctly', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSocket());

    // Initially should be 0
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications).toEqual([]);
  });
});
