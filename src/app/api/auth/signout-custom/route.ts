import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { auth, markUserSigningOut } from '@/lib/auth';

export async function POST(_request: NextRequest) {
  try {
    // Get current session
    const session = await auth();
    if (session?.user?.id) {
      // Mark user as signing out to prevent session recreation
      markUserSigningOut(session.user.id);
    }

    // Get all cookies
    const _cookieStore = cookies();

    // Create response
    const response = NextResponse.json({ success: true, message: 'Signed out successfully' });

    // Clear all NextAuth related cookies with more comprehensive approach
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Secure-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.pkce.code_verifier',
      '__Secure-next-auth.pkce.code_verifier',
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.csrf-token',
      '__Secure-authjs.csrf-token',
    ];

    // Clear each cookie with multiple domain/path combinations
    cookiesToClear.forEach(cookieName => {
      // Clear for current domain and path
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });

      // Also clear without httpOnly for client-side access
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });

      // Clear for root domain as well
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: process.env['NODE_ENV'] === 'production' ? '.smartsource.com' : 'localhost',
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });
    });

    // Set additional headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');

    return response;
  } catch (error) {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Custom signout error:', error);
    }
    return NextResponse.json({ success: false, message: 'Sign out failed' }, { status: 500 });
  }
}
