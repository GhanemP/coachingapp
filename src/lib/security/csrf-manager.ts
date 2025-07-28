// CSRF token management without setInterval for Edge Runtime compatibility
import { randomBytes } from 'crypto';

interface CSRFToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory storage for CSRF tokens
const csrfTokenStore = new Map<string, CSRFToken>();

export function generateCSRFToken(sessionId: string): string {
  // Generate a random token
  const token = randomBytes(32).toString('hex');

  const csrfToken: CSRFToken = {
    token,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  };

  csrfTokenStore.set(sessionId, csrfToken);
  return token;
}

export function validateCSRFToken(
  sessionId: string,
  token: string
): { valid: boolean; error?: string } {
  const storedToken = csrfTokenStore.get(sessionId);

  if (!storedToken) {
    return { valid: false, error: 'CSRF token not found' };
  }

  if (storedToken.expiresAt < new Date()) {
    csrfTokenStore.delete(sessionId);
    return { valid: false, error: 'CSRF token expired' };
  }

  const valid = token === storedToken.token;

  if (valid) {
    // Rotate token after successful validation
    csrfTokenStore.delete(sessionId);
  }

  return { valid };
}

// Manual cleanup function that can be called periodically
export function cleanupExpiredTokens(): void {
  const now = new Date();
  for (const [sessionId, token] of csrfTokenStore.entries()) {
    if (token.expiresAt < now) {
      csrfTokenStore.delete(sessionId);
    }
  }
}
