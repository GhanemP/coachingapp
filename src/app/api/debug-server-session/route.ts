import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG SERVER SESSION ===');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const session = await getSession();
    console.log('Server session result:', session);
    
    return NextResponse.json({
      success: true,
      session: session,
      hasSession: !!session,
      sessionUser: session?.user || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Server session error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}