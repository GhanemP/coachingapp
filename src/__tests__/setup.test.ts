/**
 * Basic test to validate Jest configuration
 */

describe('Jest Configuration', () => {
  it('should be properly configured', () => {
    expect(true).toBe(true);
  });

  it('should have access to testing utilities', () => {
    expect(jest).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have proper environment setup', () => {
    expect(process.env['NODE_ENV']).toBe('test');
    expect(process.env['NEXTAUTH_SECRET']).toBe('test-secret');
    expect(process.env['NEXTAUTH_URL']).toBe('http://localhost:3000');
  });

  it('should have DOM environment available', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('should have mocked globals available', () => {
    expect(global.fetch).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
  });
});
