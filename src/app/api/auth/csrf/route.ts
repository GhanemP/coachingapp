import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import logger from '@/lib/logger';
import { generateCSRFToken } from '@/lib/security/csrf-manager';

export async function GET(request: NextRequest) {
  try {
    // For login flow, we need to generate CSRF token without requiring authentication
    // Check if this is for login (no session yet) or for authenticated requests
    const session = await auth();

    // Generate a CSRF token - use session token if available, otherwise use a temporary identifier
    let tokenBase: string;

    if (session?.user?.id) {
      // For authenticated users, use session token
      const sessionToken = request.cookies.get('next-auth.session-token')?.value;
      tokenBase = sessionToken || `temp-${Date.now()}-${Math.random()}`;

      logger.info('CSRF token generated for authenticated user', {
        userId: session.user.id,
        hasSessionToken: !!sessionToken,
      });
    } else {
      // For login flow, generate temporary token
      tokenBase = `login-${Date.now()}-${Math.random()}`;

      logger.info('CSRF token generated for login flow');
    }

    // Generate CSRF token
    const csrfToken = generateCSRFToken(tokenBase);

    // Return the CSRF token
    const response = NextResponse.json({
      csrfToken,
      success: true,
    });

    // Set CSRF token in cookie for additional security
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Error generating CSRF token:', error as Error);
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
  }
}

// POST method for token refresh
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = request.cookies.get('next-auth.session-token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 401 });
    }

    // Generate new CSRF token
    const csrfToken = generateCSRFToken(sessionToken);

    logger.info('CSRF token refreshed', {
      userId: session.user.id,
    });

    const response = NextResponse.json({
      csrfToken,
      success: true,
      refreshed: true,
    });

    // Update cookie
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 3600,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Error refreshing CSRF token:', error as Error);
    return NextResponse.json({ error: 'Failed to refresh CSRF token' }, { status: 500 });
  }
}
