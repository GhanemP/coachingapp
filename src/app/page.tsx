import PageClient from "./page-client";

// This is a server component that renders the client component
// This pattern avoids prerendering issues with client-side hooks
export default function Home() {
  return <PageClient />;
}
