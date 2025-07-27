"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Settings, Bell, Shield, Clock, Save, RotateCcw } from "lucide-react";


interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    timezone: string;
    dateFormat: string;
    language: string;
  };
  notifications: {
    emailEnabled: boolean;
    emailHost: string;
    emailPort: number;
    emailFrom: string;
    sessionReminders: boolean;
    reportNotifications: boolean;
  };
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecial: boolean;
    sessionTimeout: number;
    twoFactorEnabled: boolean;
  };
  coaching: {
    defaultSessionDuration: number;
    reminderHoursBefore: number;
    maxSessionsPerDay: number;
    allowSelfScheduling: boolean;
    requirePreparationNotes: boolean;
  };
}

export default function SystemSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: "Coaching App",
      siteDescription: "Call Center Performance Management System",
      timezone: "UTC",
      dateFormat: "MM/dd/yyyy",
      language: "en",
    },
    notifications: {
      emailEnabled: true,
      emailHost: "smtp.example.com",
      emailPort: 587,
      emailFrom: "noreply@example.com",
      sessionReminders: true,
      reportNotifications: false,
    },
    security: {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: false,
      sessionTimeout: 30,
      twoFactorEnabled: false,
    },
    coaching: {
      defaultSessionDuration: 30,
      reminderHoursBefore: 24,
      maxSessionsPerDay: 5,
      allowSelfScheduling: false,
      requirePreparationNotes: true,
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    // In a real app, fetch settings from API
    setLoading(false);
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    // In a real app, save settings to API
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved successfully!");
    }, 1000);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      // Reset to defaults
      window.location.reload();
    }
  };

  const tabs = [
    { id: "general", name: "General", icon: Settings },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Shield },
    { id: "coaching", name: "Coaching", icon: Clock },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-2">
              Configure system-wide settings and preferences
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">General Settings</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.siteName}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, siteName: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Site Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Description
                  </label>
                  <textarea
                    value={settings.general.siteDescription}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, siteDescription: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Site Description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, timezone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Timezone"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={settings.general.language}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, language: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Language"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailEnabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, emailEnabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sessionReminders}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, sessionReminders: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Send Session Reminders</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.reportNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, reportNotifications: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Send Report Notifications</span>
                  </label>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Email Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={settings.notifications.emailHost}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailHost: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!settings.notifications.emailEnabled}
                        aria-label="SMTP Host"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={settings.notifications.emailPort}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailPort: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!settings.notifications.emailEnabled}
                        aria-label="SMTP Port"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Password Requirements</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Password Length
                      </label>
                      <input
                        type="number"
                        value={settings.security.passwordMinLength}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, passwordMinLength: parseInt(e.target.value) }
                        })}
                        min="6"
                        max="32"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Minimum Password Length"
                      />
                    </div>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.security.passwordRequireUppercase}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, passwordRequireUppercase: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Require Uppercase Letters</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.security.passwordRequireNumbers}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, passwordRequireNumbers: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Require Numbers</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.security.passwordRequireSpecial}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: { ...settings.security, passwordRequireSpecial: e.target.checked }
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Require Special Characters</span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                      })}
                      min="5"
                      max="120"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Session Timeout"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "coaching" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Coaching Settings</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Session Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.coaching.defaultSessionDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        coaching: { ...settings.coaching, defaultSessionDuration: parseInt(e.target.value) }
                      })}
                      min="15"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Default Session Duration"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send Reminder Before (hours)
                    </label>
                    <input
                      type="number"
                      value={settings.coaching.reminderHoursBefore}
                      onChange={(e) => setSettings({
                        ...settings,
                        coaching: { ...settings.coaching, reminderHoursBefore: parseInt(e.target.value) }
                      })}
                      min="1"
                      max="72"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Send Reminder Before"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Sessions Per Day
                    </label>
                    <input
                      type="number"
                      value={settings.coaching.maxSessionsPerDay}
                      onChange={(e) => setSettings({
                        ...settings,
                        coaching: { ...settings.coaching, maxSessionsPerDay: parseInt(e.target.value) }
                      })}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Max Sessions Per Day"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.coaching.allowSelfScheduling}
                      onChange={(e) => setSettings({
                        ...settings,
                        coaching: { ...settings.coaching, allowSelfScheduling: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Agents to Self-Schedule Sessions</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.coaching.requirePreparationNotes}
                      onChange={(e) => setSettings({
                        ...settings,
                        coaching: { ...settings.coaching, requirePreparationNotes: e.target.checked }
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Preparation Notes for Sessions</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
