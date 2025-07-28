import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent prerendering issues with redirects

export default function ManagerPage() {
  // Redirect to the manager dashboard
  redirect('/manager/dashboard');
}
