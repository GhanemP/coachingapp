import { auth } from "@/lib/auth";
import logger from "@/lib/logger";

export async function getSession() {
  try {
    const session = await auth();
    
    // Validate session structure
    if (session && (!session.user || !session.user.id)) {
      logger.warn('Invalid session structure detected, clearing session');
      return null;
    }
    
    // Only log in development mode
    if (process.env['NODE_ENV'] === 'development') {
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
    // Handle specific JWT and JSON parsing errors
    if (error instanceof Error) {
      if (error.message.includes('JWT') || error.message.includes('JSON') || error.message.includes('Unexpected end of JSON input')) {
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
