export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth-server';

export default async function DashboardPage() {
  try {
    console.log('[DEBUG] Dashboard: Starting session retrieval');
    const session = await getSession();
    console.log('[DEBUG] Dashboard: Session retrieved', {
      hasSession: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
    });

    if (!session) {
      console.log('[DEBUG] Dashboard: No session, redirecting to home');
      redirect('/');
    }

    // Validate session has required properties
    if (!session.user || !session.user.role) {
      console.log('[DEBUG] Dashboard: Invalid session structure, redirecting with error');
      redirect('/?error=invalid_session');
    }

    // Redirect based on user role
    console.log('[DEBUG] Dashboard: Redirecting based on role:', session.user.role);
    switch (session.user.role) {
      case 'AGENT':
        redirect('/agent/dashboard');
      case 'TEAM_LEADER':
        redirect('/team-leader/dashboard');
      case 'MANAGER':
        redirect('/manager/dashboard');
      case 'ADMIN':
        redirect('/admin/dashboard');
      default:
        // For unrecognized roles, redirect to a safe default
        console.log('[DEBUG] Dashboard: Unknown role, redirecting to agent dashboard');
        redirect('/agent/dashboard');
    }
  } catch (error) {
    // Handle JSON parsing errors and other session-related errors
    // Log only in development
    console.error('[DEBUG] Dashboard session error:', error);
    console.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    if (
      error instanceof Error &&
      (error.message.includes('JSON') ||
        error.message.includes('JWT') ||
        error.message.includes('Unexpected end of JSON input'))
    ) {
      // Clear session and redirect to login with error flag
      console.log('[DEBUG] Dashboard: Session parsing error, redirecting with session_expired');
      redirect('/?error=session_expired');
    }

    // For other errors, redirect to login
    console.log('[DEBUG] Dashboard: General error, redirecting to home');
    redirect('/');
  }
}
