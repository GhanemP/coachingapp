import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/manager',
  '/team-leader',
  '/agent',
  '/agents',
  '/sessions',
  '/profile',
  '/api/agents',
  '/api/sessions',
  '/api/dashboard',
  '/api/users',
  '/api/roles',
  '/api/quick-notes',
  '/api/action-items',
  '/api/action-plans',
  '/api/notifications',
  '/api/export',
  '/api/import'
];

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth',
  '/api/health',
  '/api/test-db'
];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Create response
  const response = NextResponse.next();
  
  // Add basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Skip auth check for public routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    publicRoutes.some(route => pathname.startsWith(route))
  ) {
    return response;
  }
  
  // Special handling for home page
  if (pathname === '/') {
    const signedOut = searchParams.get('signedOut');
    const error = searchParams.get('error');
    
    // Always allow access to home page if user just signed out or there's an error
    if (signedOut || error) {
      return response;
    }
    
    // Check for NextAuth session cookies to determine if user is signing out
    const sessionToken = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
    const csrfToken = request.cookies.get('next-auth.csrf-token') || request.cookies.get('__Secure-next-auth.csrf-token');
    
    // If session cookies are missing or being cleared, allow access to home page
    if (!sessionToken || !csrfToken) {
      return response;
    }
    
    // Check if this is a sign-out request by looking at the referer
    const referer = request.headers.get('referer');
    if (referer && (referer.includes('/dashboard') || referer.includes('/admin'))) {
      // If coming from dashboard/admin pages, it might be a sign-out, allow access
      return response;
    }
    
    // Only redirect authenticated users to dashboard if they have valid session cookies
    // Add a delay mechanism to prevent immediate redirects during sign-out
    try {
      const session = await auth();
      if (session?.user) {
        // Double-check by attempting to verify the session is actually valid
        // If we can't verify or there's any doubt, allow access to home page
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (error) {
      console.error('Middleware auth error on home page:', error);
      // On auth error, allow access to home page
      return response;
    }
    
    return response;
  }
  
  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    try {
      const session = await auth();
      
      if (!session?.user) {
        // Redirect to login page for protected routes
        const loginUrl = new URL('/', request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      // Add user info to headers for API routes (optional)
      if (pathname.startsWith('/api/')) {
        response.headers.set('X-User-ID', session.user.id);
        response.headers.set('X-User-Role', session.user.role);
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      // Redirect to login on auth error
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return response;
}

// Middleware configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};