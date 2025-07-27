const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 12);
    
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        name: 'Test User',
        hashedPassword: hashedPassword,
        role: 'AGENT',
        isActive: true
      }
    });
    
    console.log('Test user created:', user.email);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Test user already exists');
    } else {
      console.error('Error creating test user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();