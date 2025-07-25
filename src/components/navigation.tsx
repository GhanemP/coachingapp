"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { UserNav } from "@/components/user-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function Navigation() {
  const { data: session } = useSession();

  // Only show navigation for authenticated users
  if (!session) {
    return null;
  }

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg font-bold text-sm">
                SS
              </div>
              <span className="text-xl font-bold text-gray-900">SmartSource</span>
              <span className="text-sm text-gray-500 hidden sm:inline">Coaching Hub</span>
            </Link>
            <div className="hidden md:flex items-center space-x-1">
              <Link href="/" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Home
              </Link>
              {session?.user?.role === 'TEAM_LEADER' && (
                <>
                  <Link href="/agents" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Agents
                  </Link>
                  <Link href="/team-leader/scorecards" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Scorecards
                  </Link>
                  <Link href="/team-leader/quick-notes" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Quick Notes
                  </Link>
                  <Link href="/team-leader/action-items" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Action Items
                  </Link>
                </>
              )}
              {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
                <>
                  <Link href="/agents" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Agents
                  </Link>
                  <Link
                    href={session?.user?.role === 'ADMIN' ? "/admin/sessions" : "/sessions"}
                    className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sessions
                  </Link>
                  <Link href="/manager/quick-notes" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Quick Notes
                  </Link>
                  <Link href="/manager/action-items" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Action Items
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <UserNav />
          </div>
        </div>
      </div>
    </nav>
  );
}