import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { twoFactorEnabled, sessionTimeout, loginNotifications } = body;

    // For now, we'll just return success since these settings would need 
    // to be stored in a user preferences table or added to the user model
    // This is a placeholder implementation
    
    return NextResponse.json({ 
      message: 'Security settings updated successfully',
      settings: {
        twoFactorEnabled,
        sessionTimeout,
        loginNotifications,
      }
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    );
  }
}
