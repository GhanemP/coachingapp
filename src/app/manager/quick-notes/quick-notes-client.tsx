"use client";
import { QuickNotesList } from '@/components/quick-notes/quick-notes-list';
import { PageHeader } from '@/components/page-header';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ManagerQuickNotesClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role !== "MANAGER") {
      router.push("/dashboard");
    } else if (status === "authenticated") {
      setIsLoading(false);
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Quick Notes"
        description="View and manage quick notes for all agents"
      />
      <div className="mt-6">
        <QuickNotesList />
      </div>
    </div>
  );
}