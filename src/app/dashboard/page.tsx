export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
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
}
