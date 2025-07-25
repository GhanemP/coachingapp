import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes and their required roles
const protectedRoutes: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/manager': ['ADMIN', 'MANAGER'],
  '/team-leader': ['ADMIN', 'MANAGER', 'TEAM_LEADER'],
  '/agent': ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'AGENT'],
};

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const protectedRoute = Object.keys(protectedRoutes).find(route => 
    pathname.startsWith(route)
  );

  if (protectedRoute) {
    // If user is not authenticated, redirect to signin
    if (!token) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // Check if user has the required role
    const allowedRoles = protectedRoutes[protectedRoute];
    const userRole = token.role as string;

    if (!allowedRoles.includes(userRole)) {
      // Redirect to dashboard if user doesn't have permission
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/team-leader/:path*',
    '/agent/:path*',
  ],
};