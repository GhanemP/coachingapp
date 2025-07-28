import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent prerendering issues with redirects

export default function AgentPage() {
  // Redirect to the agent dashboard
  redirect('/agent/dashboard');
}
