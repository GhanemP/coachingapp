/**
 * @jest-environment node
 */

describe('Redis Graceful Degradation', () => {
  // Mock ioredis to simulate connection failures
  jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      get: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      setex: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      del: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      keys: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    }));
  });

  it('should handle cache get operations gracefully when Redis is unavailable', async () => {
    // Import after mocking
    const { getCache } = await import('@/lib/redis');
    
    const result = await getCache('test-key');
    
    // Should return null instead of throwing
    expect(result).toBeNull();
  });

  it('should handle cache set operations gracefully when Redis is unavailable', async () => {
    const { setCache } = await import('@/lib/redis');
    
    // Should not throw an error
    await expect(setCache('test-key', 'test-value')).resolves.toBeUndefined();
  });

  it('should handle cache delete operations gracefully when Redis is unavailable', async () => {
    const { deleteCache } = await import('@/lib/redis');
    
    // Should not throw an error
    await expect(deleteCache('test-key')).resolves.toBeUndefined();
  });

  it('should handle cache pattern deletion gracefully when Redis is unavailable', async () => {
    const { deleteCachePattern } = await import('@/lib/redis');
    
    // Should not throw an error
    await expect(deleteCachePattern('test-*')).resolves.toBeUndefined();
  });
});
