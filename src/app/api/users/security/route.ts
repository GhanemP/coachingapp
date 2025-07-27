import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import logger from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for security settings
const securitySettingsSchema = z.object({
  twoFactorEnabled: z.boolean(),
  sessionTimeout: z.number().min(15).max(480), // 15 minutes to 8 hours
  loginNotifications: z.boolean(),
});

// Type for security settings
type SecuritySettings = {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
};

// Temporary in-memory storage for security settings
// In production, this should be stored in the database
const userSecuritySettings = new Map<string, SecuritySettings>();

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences from memory or return defaults
    const settings = userSecuritySettings.get(session.user.id) || {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      loginNotifications: true,
    };

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Error fetching security settings:', error);
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
    
    // Validate input
    const validationResult = securitySettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { twoFactorEnabled, sessionTimeout, loginNotifications } = validationResult.data;

    // Store settings in memory
    userSecuritySettings.set(session.user.id, {
      twoFactorEnabled,
      sessionTimeout,
      loginNotifications,
    });

    // Log the security settings update
    logger.info('Security settings updated', {
      userId: session.user.id,
      settings: {
        twoFactorEnabled,
        sessionTimeout,
        loginNotifications,
      },
    });

    return NextResponse.json({ 
      message: 'Security settings updated successfully',
      settings: {
        twoFactorEnabled,
        sessionTimeout,
        loginNotifications,
      }
    });
  } catch (error) {
    logger.error('Error updating security settings:', error);
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    );
  }
}
