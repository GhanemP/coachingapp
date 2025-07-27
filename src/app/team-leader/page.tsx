import { redirect } from "next/navigation";

// Force dynamic rendering to prevent prerendering issues with redirects

export default function TeamLeaderPage() {
  // Redirect to the team leader dashboard
  redirect("/team-leader/dashboard");
}
