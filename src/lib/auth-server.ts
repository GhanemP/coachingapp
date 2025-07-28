import { auth } from "@/lib/auth";
import logger from "@/lib/logger";

export async function getSession() {
  try {
    console.log('[DEBUG] auth-server: Starting auth() call');
    const session = await auth();
    console.log('[DEBUG] auth-server: auth() completed', {
      hasSession: !!session,
      sessionType: typeof session,
      sessionKeys: session ? Object.keys(session) : []
    });
    
    // Validate session structure
    if (session && (!session.user || !session.user.id)) {
      console.log('[DEBUG] auth-server: Invalid session structure detected');
      logger.warn('Invalid session structure detected, clearing session');
      return null;
    }
    
    // Only log in development mode
    if (process.env['NODE_ENV'] === 'development') {
      console.log('[DEBUG] auth-server: Session validation passed', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userRole: session?.user?.role,
        sessionKeys: session ? Object.keys(session) : [],
        userKeys: session?.user ? Object.keys(session.user) : []
      });
      
      logger.debug('Server session retrieved', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userRole: session?.user?.role,
        sessionKeys: session ? Object.keys(session) : [],
        userKeys: session?.user ? Object.keys(session.user) : []
      });
    }
    
    return session;
  } catch (error) {
    console.error('[DEBUG] auth-server: Error in getSession:', error);
    console.error('[DEBUG] auth-server: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error
    });
    
    // Handle specific JWT and JSON parsing errors
    if (error instanceof Error) {
      if (error.message.includes('JWT') || error.message.includes('JSON') || error.message.includes('Unexpected end of JSON input')) {
        console.log('[DEBUG] auth-server: JWT/JSON parsing error detected');
        logger.warn('Session validation failed due to malformed token, clearing session', {
          errorMessage: error.message,
          stack: error.stack
        });
        // Return null to indicate invalid session
        return null;
      }
    }
    
    logger.error('Error in getSession:', error as Error);
    return null;
  }
}
