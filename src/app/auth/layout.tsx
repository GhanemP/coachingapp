import type { Metadata } from "next";
import "../globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "SmartSource Coaching Hub - Authentication",
  description: "Sign in or sign up to access SmartSource Coaching Hub",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      {/* No Navigation component here - auth pages should not show navigation */}
      {children}
      <Toaster />
    </Providers>
  );
}