"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";

export function Navigation() {
  const { data: session } = useSession();

  // Only show navigation for authenticated users
  if (!session) {
    return null;
  }

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              SmartSource Coaching Hub
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              {session?.user?.role === 'TEAM_LEADER' && (
                <>
                  <Link href="/agents" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    Agents
                  </Link>
                  <Link href="/team-leader/scorecards" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    Scorecards
                  </Link>
                </>
              )}
              {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
                <>
                  <Link href="/agents" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                    Agents
                  </Link>
                  <Link
                    href={session?.user?.role === 'ADMIN' ? "/admin/sessions" : "/sessions"}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sessions
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </div>
    </nav>
  );
}