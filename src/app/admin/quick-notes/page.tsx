"use client";
import { QuickNotesList } from '@/components/quick-notes/quick-notes-list';
import { PageHeader } from '@/components/page-header';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/constants";

export default function AdminQuickNotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session?.user?.role !== UserRole.ADMIN) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Quick Notes"
        description="Manage and view all quick notes across the organization"
      />
      <QuickNotesList />
    </div>
  );
}