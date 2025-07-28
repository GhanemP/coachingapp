import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent prerendering issues with redirects

// This page simply redirects to the admin dashboard client component
// It doesn't need to be a client component
export default function AdminDashboardPage() {
  // Redirect to the admin dashboard client component
  redirect('/admin/dashboard/client');
}
