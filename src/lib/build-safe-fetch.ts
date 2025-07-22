/**
 * Build-safe fetch wrapper that prevents API calls during static generation
 */
export function buildSafeFetch(url: string, options?: RequestInit): Promise<Response> {
  // During build time, return a mock response to prevent warnings
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    return Promise.resolve(new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
  }
  
  // In browser or development, use regular fetch
  return fetch(url, options);
}
