import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    return NextResponse.json({
      success: true,
      session: session,
      hasSession: !!session,
      timestamp: new Date().toISOString(),
      cookies: request.cookies.getAll().map(cookie => ({
        name: cookie.name,
        value: cookie.value.substring(0, 20) + "..." // Truncate for security
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
}