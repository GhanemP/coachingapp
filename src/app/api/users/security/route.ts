import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    // Return default values if no preferences exist
    const defaultPreferences = {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      loginNotifications: true,
      emailNotifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
    };

    return NextResponse.json(preferences || defaultPreferences);
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      twoFactorEnabled, 
      sessionTimeout, 
      loginNotifications, 
      emailNotifications,
      theme,
      language,
      timezone 
    } = body;

    // Validate sessionTimeout
    const validTimeouts = [15, 30, 60, 120, 240];
    const timeout = validTimeouts.includes(parseInt(sessionTimeout)) 
      ? parseInt(sessionTimeout) 
      : 30;

    // Upsert user preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        twoFactorEnabled: Boolean(twoFactorEnabled),
        sessionTimeout: timeout,
        loginNotifications: Boolean(loginNotifications),
        emailNotifications: Boolean(emailNotifications),
        theme: theme || 'light',
        language: language || 'en',
        timezone: timezone || 'UTC',
      },
      create: {
        userId: session.user.id,
        twoFactorEnabled: Boolean(twoFactorEnabled),
        sessionTimeout: timeout,
        loginNotifications: Boolean(loginNotifications),
        emailNotifications: Boolean(emailNotifications),
        theme: theme || 'light',
        language: language || 'en',
        timezone: timezone || 'UTC',
      },
    });

    // Log the security settings change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'security_settings_update',
        description: 'User updated security preferences',
        metadata: JSON.stringify({
          twoFactorEnabled,
          sessionTimeout: timeout,
          loginNotifications,
          emailNotifications,
        }),
      },
    });

    return NextResponse.json({ 
      message: 'Security settings updated successfully',
      preferences 
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    );
  }
}
