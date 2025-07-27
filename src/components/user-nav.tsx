"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { markUserSigningOut } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export function UserNav() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-lg hover:bg-[#51B1A8]/10 transition-all duration-200 p-0">
          <Avatar className="h-10 w-10 ring-2 ring-[#51B1A8]/20 ring-offset-2">
            <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
            <AvatarFallback className="bg-[#51B1A8] text-white font-semibold">
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 shadow-xl border-gray-200" align="end">
        <div className="bg-gradient-to-r from-[#51B1A8]/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-[#51B1A8]/20 flex-shrink-0">
              <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
              <AvatarFallback className="bg-[#51B1A8] text-white font-semibold text-lg">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 min-w-0 flex-1">
              {session.user.name && (
                <p className="font-semibold text-gray-900 break-words">{session.user.name}</p>
              )}
              {session.user.email && (
                <p className="text-sm text-gray-600 break-all">
                  {session.user.email}
                </p>
              )}
              {session.user.role && (
                <p className="text-xs font-medium text-[#51B1A8] capitalize">
                  {session.user.role.toLowerCase().replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-1">
          <DropdownMenuItem className="px-3 py-2.5 rounded-md hover:bg-[#51B1A8]/10 cursor-pointer transition-all duration-200">
            <Link href="/profile" className="w-full flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            className="px-3 py-2.5 rounded-md hover:bg-red-50 cursor-pointer transition-all duration-200 text-red-600 hover:text-red-700"
            onClick={async () => {
              try {
                console.log('🚪 Starting logout with proper session cleanup...');
                
                // Mark user as signing out to prevent session recreation
                if (session?.user?.id) {
                  markUserSigningOut(session.user.id);
                }
                
                // Set signing out flag to prevent automatic redirect on landing page
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('signing-out', 'true');
                }
                
                // Clear storage and cookies immediately
                if (typeof window !== 'undefined') {
                  localStorage.clear();
                  // Don't clear sessionStorage completely since we need the signing-out flag
                  // sessionStorage.clear();
                  
                  // Clear cookies more thoroughly
                  const cookiesToClear = [
                    'next-auth.session-token',
                    '__Secure-next-auth.session-token',
                    'next-auth.csrf-token',
                    '__Secure-next-auth.csrf-token',
                    'next-auth.callback-url',
                    '__Secure-next-auth.callback-url',
                    'authjs.session-token',
                    '__Secure-authjs.session-token',
                    'authjs.csrf-token',
                    '__Secure-authjs.csrf-token'
                  ];
                  
                  cookiesToClear.forEach(cookieName => {
                    // Clear for multiple path and domain combinations
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; max-age=0`;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}; max-age=0`;
                    if (window.location.hostname.includes('.')) {
                      const parentDomain = '.' + window.location.hostname.split('.').slice(-2).join('.');
                      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${parentDomain}; max-age=0`;
                    }
                  });
                }
                
                // Wait for session cleanup to complete before redirecting
                try {
                  console.log('🧹 Clearing server-side session...');
                  
                  // Wait for both cleanup operations to complete
                  await Promise.allSettled([
                    // Custom signout API
                    fetch('/api/auth/signout-custom', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    }),
                    
                    // NextAuth signOut (without redirect)
                    signOut({ redirect: false })
                  ]);
                  
                  console.log('✅ Session cleanup completed');
                  
                } catch (cleanupError) {
                  console.warn('⚠️ Cleanup error (proceeding with redirect):', cleanupError);
                }
                
                // Small delay to ensure session state is fully cleared
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Now redirect with cleared session
                const redirectUrl = '/?signedOut=true&t=' + Date.now();
                
                if (typeof window !== 'undefined') {
                  console.log('🔄 Redirecting to landing page...');
                  window.location.replace(redirectUrl);
                }
                
              } catch (error) {
                console.error('💥 Sign out error:', error);
                // Fallback: force redirect
                if (typeof window !== 'undefined') {
                  window.location.replace('/?signedOut=true&force=true');
                }
              }
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}