export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-server";

export default async function DashboardPage() {
  try {
    const session = await getSession();

    if (!session) {
      redirect("/");
    }

    // Validate session has required properties
    if (!session.user || !session.user.role) {
      redirect("/?error=invalid_session");
    }

    // Redirect based on user role
    switch (session.user.role) {
      case "AGENT":
        redirect("/agent/dashboard");
      case "TEAM_LEADER":
        redirect("/team-leader/dashboard");
      case "MANAGER":
        redirect("/manager/dashboard");
      case "ADMIN":
        redirect("/admin/dashboard");
      default:
        // For unrecognized roles, redirect to a safe default
        redirect("/agent/dashboard");
    }
  } catch (error) {
    // Handle JSON parsing errors and other session-related errors
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard session error:', error);
    }
    
    if (error instanceof Error &&
        (error.message.includes('JSON') ||
         error.message.includes('JWT') ||
         error.message.includes('Unexpected end of JSON input'))) {
      // Clear session and redirect to login with error flag
      redirect("/?error=session_expired");
    }
    
    // For other errors, redirect to login
    redirect("/");
  }
}
