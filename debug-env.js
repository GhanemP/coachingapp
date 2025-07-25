// Debug script to check environment variables
console.log('=== Environment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET);

// Test Prisma connection
const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  try {
    console.log('\n=== Testing Prisma ===');
    const prisma = new PrismaClient();
    const userCount = await prisma.user.count();
    console.log('✅ Prisma connection successful, user count:', userCount);
    await prisma.$disconnect();
  } catch (error) {
    console.log('❌ Prisma connection failed:', error.message);
  }
}

testPrisma();
