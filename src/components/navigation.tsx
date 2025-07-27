"use client";

import Link from "next/link";
import Image from "next/image";
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
    <nav className="bg-white shadow-lg border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center flex-1">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 transition-all duration-200 group-hover:scale-105">
                <Image
                  src="/Smartsource logo.jpeg"
                  alt="SmartSource Logo"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-md group-hover:shadow-lg object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">SmartSource</span>
                <span className="text-xs text-gray-500 font-medium tracking-wide">COACHING HUB</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-2 ml-12">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Dashboard
              </Link>
              {session?.user?.role === 'TEAM_LEADER' && (
                <>
                  <Link
                    href="/agents"
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Agents
                  </Link>
                  <Link
                    href="/team-leader/scorecards"
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Scorecards
                  </Link>
                  <Link
                    href="/team-leader/quick-notes"
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Quick Notes
                  </Link>
                  <Link
                    href="/team-leader/action-items"
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Action Items
                  </Link>
                </>
              )}
              {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
                <>
                  <Link
                    href="/agents"
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Agents
                  </Link>
                  <Link
                    href={session?.user?.role === 'ADMIN' ? "/admin/sessions" : "/sessions"}
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Sessions
                  </Link>
                  <Link
                    href={session?.user?.role === 'ADMIN' ? "/admin/quick-notes" : "/manager/quick-notes"}
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Quick Notes
                  </Link>
                  <Link
                    href={session?.user?.role === 'ADMIN' ? "/admin/action-items" : "/manager/action-items"}
                    className="text-gray-700 hover:text-[#51B1A8] hover:bg-[#51B1A8]/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Action Items
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center space-x-3">
              {session?.user?.name && (
                <span className="hidden lg:block text-sm font-medium text-gray-700">
                  {session.user.name}
                </span>
              )}
              <UserNav />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}