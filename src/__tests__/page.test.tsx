/**
 * @jest-environment jsdom
 */

describe('Basic Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to global test utilities', () => {
    expect(global.ResizeObserver).toBeDefined();
  });
});
