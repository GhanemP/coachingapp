import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { User } from "next-auth";
import { UserRole } from "@/lib/constants";

export const authOptions: NextAuthOptions = {
  // Remove adapter for credentials-only authentication
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 Auth attempt for:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          console.log('❌ User not found:', credentials.email);
          return null;
        }

        console.log('✅ User found, checking password...');
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword || ""
        );

        if (!isPasswordValid) {
          console.log('❌ Invalid password for:', credentials.email);
          return null;
        }

        console.log('✅ Authentication successful for:', credentials.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          managedBy: user.managedBy,
          teamLeaderId: user.teamLeaderId,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as User;
        token.id = typedUser.id;
        token.role = typedUser.role;
        token.managedBy = typedUser.managedBy;
        token.teamLeaderId = typedUser.teamLeaderId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.managedBy = token.managedBy;
        session.user.teamLeaderId = token.teamLeaderId;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};