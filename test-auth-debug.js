const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔍 Testing database connection and authentication...');
    
    // Test database connection
    console.log('\n1. Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Found ${userCount} users.`);
    
    // Find the admin user
    console.log('\n2. Looking for admin@example.com...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.hashedPassword
    });
    
    // Test password verification
    console.log('\n3. Testing password verification...');
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.hashedPassword || '');
    console.log(`Password verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!isValid) {
      console.log('🔍 Stored hash:', user.hashedPassword?.substring(0, 20) + '...');
      console.log('🔍 Test password:', testPassword);
      
      // Try creating a new hash to compare
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('🔍 New hash would be:', newHash.substring(0, 20) + '...');
    }
    
    // Test if user is active
    console.log('\n4. Checking user status...');
    if (!user.isActive) {
      console.log('❌ User is INACTIVE!');
    } else {
      console.log('✅ User is ACTIVE');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();