import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
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
      // For unrecognized roles, show a generic dashboard
      return (
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">
              Welcome, {session.user.name || session.user.email}!
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Role: {session.user.role}
            </p>
          </div>
        </div>
      );
  }
}