'use client';
import { Lock, User, Camera, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    department: '',
    avatar: session?.user?.image || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginNotifications: true,
  });

  const departments = [
    'Customer Service',
    'Sales',
    'Technical Support',
    'Quality Assurance',
    'Training',
    'Management',
    'Human Resources',
    'IT Support',
  ];

  const fetchProfileData = useCallback(async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          name: data.name || '',
          email: data.email || '',
          department: data.department || '',
          avatar: session?.user?.image || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [session?.user?.image]);

  // Fetch profile data and security settings on mount
  useEffect(() => {
    if (session?.user) {
      fetchProfileData();
      fetchSecuritySettings();
    }
  }, [session, fetchProfileData]);

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch('/api/users/security');
      if (response.ok) {
        const data = await response.json();
        setSecuritySettings({
          twoFactorEnabled: data.twoFactorEnabled,
          sessionTimeout: data.sessionTimeout,
          loginNotifications: data.loginNotifications,
        });
      }
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
    }
  };

  if (status === 'loading' || isLoadingProfile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    redirect('/');
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type. Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Please select an image smaller than 5MB.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { avatarUrl } = await response.json();
        setProfileData({ ...profileData, avatar: avatarUrl });
        await update({ image: avatarUrl });
        toast.success('Your profile picture has been updated successfully.');
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch {
      toast.error('Failed to update your profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const updatedData = await response.json();
        // Update the session with new data
        await update({
          name: updatedData.name,
          email: updatedData.email,
        });
        toast.success('Your profile has been updated successfully.');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update your profile. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match. Please make sure your new passwords match.");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password too short. Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Your password has been updated successfully.');
      } else {
        const { error } = await response.json();
        throw new Error(error || 'Failed to update password');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Your security preferences have been updated.');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update security settings');
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update security settings. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileData.avatar} alt={profileData.name} />
                <AvatarFallback className="text-lg">
                  {profileData.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Change Avatar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  aria-label="Upload avatar image"
                />
                <p className="text-sm text-muted-foreground">JPG, PNG, or GIF. Max 5MB.</p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Enter your email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={profileData.department}
                  onValueChange={value => setProfileData({ ...profileData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={session?.user?.role || ''} disabled className="bg-muted" />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={e =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                placeholder="Enter your current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter your new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={e =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                placeholder="Confirm your new password"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Updating...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Manage your account security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button
              variant={securitySettings.twoFactorEnabled ? 'default' : 'outline'}
              onClick={() =>
                setSecuritySettings({
                  ...securitySettings,
                  twoFactorEnabled: !securitySettings.twoFactorEnabled,
                })
              }
            >
              {securitySettings.twoFactorEnabled ? 'Enabled' : 'Enable'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Select
              value={String(securitySettings.sessionTimeout)}
              onValueChange={value =>
                setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(value) })
              }
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Login Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when someone signs into your account
              </p>
            </div>
            <Button
              variant={securitySettings.loginNotifications ? 'default' : 'outline'}
              onClick={() =>
                setSecuritySettings({
                  ...securitySettings,
                  loginNotifications: !securitySettings.loginNotifications,
                })
              }
            >
              {securitySettings.loginNotifications ? 'On' : 'Off'}
            </Button>
          </div>

          <Button onClick={handleSecurityUpdate} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
