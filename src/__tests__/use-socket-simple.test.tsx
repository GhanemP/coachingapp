/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../hooks/use-socket';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
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

describe('useSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([]),
    });
  });

  it('should not create socket when user is not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSocket());

    expect(result.current.connected).toBe(false);
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should provide socket methods', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSocket());

    expect(typeof result.current.markNotificationRead).toBe('function');
    expect(typeof result.current.joinAgentRoom).toBe('function');
    expect(typeof result.current.joinTeamRoom).toBe('function');
    expect(result.current.socket).toBe(null);
  });
});
