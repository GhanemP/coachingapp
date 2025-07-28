import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent prerendering issues with redirects

// This page simply redirects to the admin dashboard
// It doesn't need to be a client component
export default function AdminPage() {
  // Redirect to the admin dashboard
  redirect('/admin/dashboard');
}
