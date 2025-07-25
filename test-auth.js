const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    // Test password verification
    const testPassword = 'password123';
    const user = await prisma.user.findUnique({
      where: { email: 'admin@company.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('📧 Stored hash:', user.hashedPassword);
    
    const isValid = await bcrypt.compare(testPassword, user.hashedPassword);
    console.log('🔐 Password valid:', isValid);
    
    // Test creating a new hash
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('🆕 New hash:', newHash);
    
    const newHashValid = await bcrypt.compare(testPassword, newHash);
    console.log('🔐 New hash valid:', newHashValid);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
