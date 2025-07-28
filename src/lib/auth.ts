// Removed unused PrismaAdapter import
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

import { UserRole } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

// SECURITY FIX: Improved sign-out state tracker with better memory management
const signingOutUsers = new Map<string, number>();
const SIGNOUT_TIMEOUT = 10000; // 10 seconds
const MAX_SIGNOUT_ENTRIES = 1000; // Prevent unbounded growth

// Manual cleanup function instead of setInterval for serverless compatibility
function cleanupSignoutUsers(): void {
  const now = Date.now();
  const expiredUsers: string[] = [];

  for (const [userId, timestamp] of signingOutUsers.entries()) {
    if (now - timestamp > SIGNOUT_TIMEOUT) {
      expiredUsers.push(userId);
    }
  }

  // Remove expired entries
  expiredUsers.forEach(userId => signingOutUsers.delete(userId));

  // If still too many entries, remove oldest ones
  if (signingOutUsers.size > MAX_SIGNOUT_ENTRIES) {
    const entries = Array.from(signingOutUsers.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, signingOutUsers.size - MAX_SIGNOUT_ENTRIES);

    entries.forEach(([userId]) => signingOutUsers.delete(userId));
  }
}

export function markUserSigningOut(userId: string) {
  // SECURITY: Cleanup before adding new entry
  cleanupSignoutUsers();
  signingOutUsers.set(userId, Date.now());
}

export function isUserSigningOut(userId: string): boolean {
  // SECURITY: Cleanup before checking
  cleanupSignoutUsers();

  const timestamp = signingOutUsers.get(userId);
  if (!timestamp) {
    return false;
  }

  // Auto-cleanup expired entries
  if (Date.now() - timestamp > SIGNOUT_TIMEOUT) {
    signingOutUsers.delete(userId);
    return false;
  }

  return true;
}

// Server restart cleanup function
export function clearServerState() {
  // Clear server authentication state on restart
  signingOutUsers.clear();
}

// Initialize cleanup on server start
if (typeof window === 'undefined') {
  // Clear any stale state on server restart
  clearServerState();
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  basePath: '/api/auth',
  useSecureCookies: process.env['NODE_ENV'] === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env['NODE_ENV'] === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env['NODE_ENV'] === 'production',
      },
    },
  },
  providers: [
    Google({
      clientId: process.env['GOOGLE_CLIENT_ID']!,
      clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async credentials => {
        // SECURITY: Remove all debug logging to prevent credential exposure
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });

          if (!user || !user.isActive) {
            return null;
          }

          if (!user.hashedPassword) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

          if (!isPasswordValid) {
            return null;
          }

          const userObject = {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            role: user.role as UserRole,
            managedBy: user.managedBy,
            teamLeaderId: user.teamLeaderId,
          };

          return userObject;
        } catch (error) {
          // SECURITY: Log errors without exposing sensitive data
          // Use proper logger instead of console
          if (process.env.NODE_ENV === 'development') {
            console.error('Authentication error occurred:', error);
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  events: {
    async signOut(_message) {
      // SECURITY: Remove debug logging
      // This event is triggered when signOut() is called
      // We can use this to perform additional cleanup if needed
    },
  },
  callbacks: {
    async signIn({ user, account, profile: _profile }) {
      if (account?.provider === 'google') {
        try {
          const email = user.email?.toLowerCase().trim();
          if (!email) {
            // No email provided by Google OAuth
            return false;
          }

          // Check if user exists in database
          let dbUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!dbUser) {
            // Create new user for Google OAuth
            dbUser = await prisma.user.create({
              data: {
                email,
                name: user.name || user.email,
                isActive: true,
                role: 'AGENT', // Default role, can be changed by admin
                hashedPassword: null, // No password for OAuth users
              },
            });

            // SECURITY: Remove debug logging
          } else if (!dbUser.isActive) {
            // User account is inactive
            return false;
          } else {
            // Update existing user's name if it changed
            if (dbUser.name !== user.name && user.name) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { name: user.name },
              });
            }

            // SECURITY: Remove debug logging
          }

          // Add database user info to the user object
          user.id = dbUser.id;
          user.role = dbUser.role as UserRole;
          user.managedBy = dbUser.managedBy;
          user.teamLeaderId = dbUser.teamLeaderId;

          return true;
        } catch (error) {
          // Google sign-in error - log only in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Google sign-in error:', error);
          }
          return false;
        }
      }

      // For credentials provider
      return true;
    },
    jwt({ token, user }) {
      // SECURITY: Remove all debug logging to prevent token exposure

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.managedBy = user.managedBy;
        token.teamLeaderId = user.teamLeaderId;
      }

      return token;
    },
    session({ session, token }) {
      // SECURITY: Remove all debug logging to prevent session data exposure

      // Check if user is signing out - if so, don't build session
      if (token?.id && isUserSigningOut(token.id as string)) {
        return session;
      }

      if (token && session?.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as UserRole;
        session.user.managedBy = token.managedBy as string | null;
        session.user.teamLeaderId = token.teamLeaderId as string | null;
      }

      return session;
    },
  },
  pages: {
    signIn: '/',
    signOut: '/?signedOut=true',
  },
  secret: process.env['NEXTAUTH_SECRET'],
  debug: process.env['NODE_ENV'] === 'development',
});
