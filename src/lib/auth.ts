import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@/lib/constants"

// Global sign-out state tracker to prevent session recreation during sign-out
const signingOutUsers = new Map<string, number>();
const CLEANUP_INTERVAL = 30000; // 30 seconds
const SIGNOUT_TIMEOUT = 10000; // 10 seconds

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of signingOutUsers.entries()) {
    if (now - timestamp > SIGNOUT_TIMEOUT) {
      signingOutUsers.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

export function markUserSigningOut(userId: string) {
  signingOutUsers.set(userId, Date.now());
}

export function isUserSigningOut(userId: string): boolean {
  const timestamp = signingOutUsers.get(userId);
  if (!timestamp) return false;
  
  // Auto-cleanup expired entries
  if (Date.now() - timestamp > SIGNOUT_TIMEOUT) {
    signingOutUsers.delete(userId);
    return false;
  }
  
  return true;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  basePath: "/api/auth",
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (process.env.NODE_ENV === 'development') {
          console.log("🚨 AUTHORIZE FUNCTION CALLED - NextAuth v5");
          console.log("📧 Credentials received:", {
            email: credentials?.email,
            hasPassword: !!credentials?.password
          });
        }

        if (!credentials?.email || !credentials?.password) {
          if (process.env.NODE_ENV === 'development') {
            console.log("❌ Missing email or password");
          }
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          if (process.env.NODE_ENV === 'development') {
            console.log("🔍 Looking up user in database...");
          }
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
          });

          if (process.env.NODE_ENV === 'development') {
            console.log("👤 User lookup result:", {
              found: !!user,
              email: user?.email,
              isActive: user?.isActive,
              role: user?.role
            });
          }

          if (!user || !user.isActive) {
            if (process.env.NODE_ENV === 'development') {
              console.log("❌ User not found or inactive");
            }
            return null;
          }

          if (!user.hashedPassword) {
            if (process.env.NODE_ENV === 'development') {
              console.log("❌ User has no password (OAuth user trying credentials login)");
            }
            return null;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log("🔑 Verifying password...");
          }
          const isPasswordValid = await bcrypt.compare(
            password,
            user.hashedPassword
          );

          if (process.env.NODE_ENV === 'development') {
            console.log("🔑 Password verification result:", isPasswordValid);
          }

          if (!isPasswordValid) {
            if (process.env.NODE_ENV === 'development') {
              console.log("❌ Invalid password");
            }
            return null;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log("✅ Authentication successful - returning user object");
          }
          const userObject = {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            role: user.role as UserRole,
            managedBy: user.managedBy,
            teamLeaderId: user.teamLeaderId,
          };
          
          if (process.env.NODE_ENV === 'development') {
            console.log("🔍 User object to return:", userObject);
          }
          return userObject;

        } catch (error) {
          console.error("💥 Auth error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  events: {
    async signOut(message) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🚪 SignOut event triggered - clearing session data");
      }
      // This event is triggered when signOut() is called
      // We can use this to perform additional cleanup if needed
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const email = user.email?.toLowerCase().trim();
          if (!email) {
            console.error("❌ No email provided by Google");
            return false;
          }

          // Check if user exists in database
          let dbUser = await prisma.user.findUnique({
            where: { email }
          });

          if (!dbUser) {
            // Create new user for Google OAuth
            dbUser = await prisma.user.create({
              data: {
                email,
                name: user.name || user.email,
                isActive: true,
                role: "AGENT", // Default role, can be changed by admin
                hashedPassword: null, // No password for OAuth users
              }
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log("✅ Created new Google user:", dbUser.email);
            }
          } else if (!dbUser.isActive) {
            console.error("❌ User account is inactive:", email);
            return false;
          } else {
            // Update existing user's name if it changed
            if (dbUser.name !== user.name && user.name) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { name: user.name }
              });
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log("✅ Google user signed in:", dbUser.email);
            }
          }

          // Add database user info to the user object
          user.id = dbUser.id;
          user.role = dbUser.role as UserRole;
          user.managedBy = dbUser.managedBy;
          user.teamLeaderId = dbUser.teamLeaderId;

          return true;
        } catch (error) {
          console.error("💥 Google sign-in error:", error);
          return false;
        }
      }
      
      // For credentials provider
      return true;
    },
    async jwt({ token, user }) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 JWT callback called:", {
          hasUser: !!user,
          tokenKeys: Object.keys(token)
        });
      }


      if (user) {
        if (process.env.NODE_ENV === 'development') {
          console.log("🔄 JWT callback - storing user data in token");
        }
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.managedBy = user.managedBy;
        token.teamLeaderId = user.teamLeaderId;
        
        if (process.env.NODE_ENV === 'development') {
          console.log("🔄 JWT callback - token updated with role:", token.role);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Session callback called");
      }

      // Check if user is signing out - if so, don't build session
      if (token?.id && isUserSigningOut(token.id as string)) {
        if (process.env.NODE_ENV === 'development') {
          console.log("🚪 Session callback - user is signing out, skipping session build");
        }
        return session;
      }

      if (token && session?.user) {
        if (process.env.NODE_ENV === 'development') {
          console.log("🔄 Session callback - building session from token");
        }
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as UserRole;
        session.user.managedBy = token.managedBy as string | null;
        session.user.teamLeaderId = token.teamLeaderId as string | null;
        
        if (process.env.NODE_ENV === 'development') {
          console.log("✅ Session callback - final session user role:", session.user.role);
        }
      }
      
      return session;
    }
  },
  pages: {
    signIn: "/",
    signOut: "/?signedOut=true",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
})