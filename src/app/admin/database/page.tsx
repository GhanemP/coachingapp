"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, RefreshCw, Trash2, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface DatabaseStats {
  users: number;
  sessions: number;
  kpis: number;
  totalSize: string;
  lastBackup: string;
}

export default function DatabaseManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DatabaseStats>({
    users: 0,
    sessions: 0,
    kpis: 0,
    totalSize: "0 MB",
    lastBackup: "Never",
  });
  const [operations, setOperations] = useState({
    backup: false,
    restore: false,
    cleanup: false,
    reset: false,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    // In a real app, fetch database stats from API
    setStats({
      users: 42,
      sessions: 156,
      kpis: 1248,
      totalSize: "12.5 MB",
      lastBackup: "2024-01-15 14:30:00",
    });
    setLoading(false);
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading database information...</p>
        </div>
      </div>
    );
  }

  const handleBackup = async () => {
    setOperations({ ...operations, backup: true });
    // In a real app, trigger backup via API
    setTimeout(() => {
      setOperations({ ...operations, backup: false });
      alert("Database backup completed successfully!");
      setStats({ ...stats, lastBackup: new Date().toLocaleString() });
    }, 2000);
  };

  const handleRestore = async () => {
    if (!confirm("Are you sure you want to restore the database? This will overwrite current data.")) {
      return;
    }
    setOperations({ ...operations, restore: true });
    // In a real app, trigger restore via API
    setTimeout(() => {
      setOperations({ ...operations, restore: false });
      alert("Database restored successfully!");
    }, 3000);
  };

  const handleCleanup = async () => {
    if (!confirm("This will remove old sessions and logs. Continue?")) {
      return;
    }
    setOperations({ ...operations, cleanup: true });
    // In a real app, trigger cleanup via API
    setTimeout(() => {
      setOperations({ ...operations, cleanup: false });
      alert("Database cleanup completed!");
      setStats({ ...stats, totalSize: "10.2 MB" });
    }, 1500);
  };

  const handleReset = async () => {
    const confirmation = prompt("Type 'RESET DATABASE' to confirm this action:");
    if (confirmation !== "RESET DATABASE") {
      alert("Reset cancelled.");
      return;
    }
    setOperations({ ...operations, reset: true });
    // In a real app, trigger reset via API
    setTimeout(() => {
      setOperations({ ...operations, reset: false });
      alert("Database has been reset to initial state!");
      window.location.reload();
    }, 3000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
        </div>
        <p className="text-gray-600">
          Manage database operations, backups, and maintenance tasks
        </p>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{stats.users}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Sessions</div>
          <div className="text-2xl font-bold text-gray-900">{stats.sessions}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">KPI Records</div>
          <div className="text-2xl font-bold text-gray-900">{stats.kpis}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Database Size</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalSize}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Last Backup</div>
          <div className="text-sm font-medium text-gray-900">{stats.lastBackup}</div>
        </div>
      </div>

      {/* Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Restore */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Create Backup</h3>
              <p className="text-sm text-gray-600 mb-3">
                Download a complete backup of the database including all users, sessions, and KPI data.
              </p>
              <Button 
                onClick={handleBackup} 
                disabled={operations.backup}
                className="w-full"
              >
                {operations.backup ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Create Backup
                  </>
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-2">Restore from Backup</h3>
              <p className="text-sm text-gray-600 mb-3">
                Upload a backup file to restore the database to a previous state.
              </p>
              <Button 
                onClick={handleRestore} 
                disabled={operations.restore}
                variant="outline"
                className="w-full"
              >
                {operations.restore ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Restore Backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Maintenance</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Database Cleanup</h3>
              <p className="text-sm text-gray-600 mb-3">
                Remove old sessions, expired tokens, and optimize database performance.
              </p>
              <Button 
                onClick={handleCleanup} 
                disabled={operations.cleanup}
                variant="outline"
                className="w-full"
              >
                {operations.cleanup ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cleaning Up...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Cleanup
                  </>
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-2">Reset Database</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will delete all data and reset the database to its initial state.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleReset} 
                disabled={operations.reset}
                variant="destructive"
                className="w-full"
              >
                {operations.reset ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset Database
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Operations</h2>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Database Backup</div>
              <div className="text-sm text-gray-600">Completed successfully</div>
            </div>
            <div className="text-sm text-gray-500">2 hours ago</div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Automatic Cleanup</div>
              <div className="text-sm text-gray-600">Removed 45 expired sessions</div>
            </div>
            <div className="text-sm text-gray-500">1 day ago</div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Database Migration</div>
              <div className="text-sm text-gray-600">Updated schema to version 2.1</div>
            </div>
            <div className="text-sm text-gray-500">3 days ago</div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> Database backups are automatically created daily at 2:00 AM. 
            Manual backups can be created at any time. All backups are stored securely and retained for 30 days.
          </div>
        </div>
      </div>
    </div>
  );
}