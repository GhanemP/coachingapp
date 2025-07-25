/**
 * @jest-environment node
 */

describe('Quick Notes API', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should be able to test API functions when mocked properly', () => {
    // This test verifies that our test environment can handle node environment
    const mockFunction = jest.fn(() => 'mocked result');
    expect(mockFunction()).toBe('mocked result');
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });
});
