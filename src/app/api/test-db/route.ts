import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force Node.js runtime for database access
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Log the test request
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  console.log('Database test requested from IP:', ip);
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('Current working directory:', process.cwd());
    console.log('__dirname equivalent:', import.meta.url);
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query executed successfully:', result);
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log('✅ User count query successful:', userCount);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection working',
      userCount,
      testQuery: result,
      databaseUrl: process.env.DATABASE_URL
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseUrl: process.env.DATABASE_URL
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}