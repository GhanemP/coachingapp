import { auth } from "@/lib/auth";
import logger from "@/lib/logger";

export async function getSession() {
  try {
    const session = await auth();
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
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
    logger.error('Error in getSession:', error);
    return null;
  }
}
