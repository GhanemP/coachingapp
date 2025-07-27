import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkUser() {
  console.log('Checking user: teamleader1@company.com');
  
  const user = await prisma.user.findUnique({
    where: { email: 'teamleader1@company.com' }
  });
  
  if (!user) {
    console.log('❌ User not found in database');
    console.log('\nTrying to create the user...');
    
    const hashedPassword = await bcrypt.hash('teamleader123', 10);
    const newUser = await prisma.user.create({
      data: {
        email: 'teamleader1@company.com',
        name: 'Team Leader One',
        role: 'TEAM_LEADER',
        hashedPassword,
      }
    });
    
    console.log('✅ User created:', newUser.email);
    return;
  }
  
  console.log('✅ User found:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    hasPassword: !!user.hashedPassword
  });
  
  // Test password
  const testPassword = 'teamleader123';
  const isValid = await bcrypt.compare(testPassword, user.hashedPassword || '');
  console.log('Password test with "teamleader123":', isValid ? '✅ Valid' : '❌ Invalid');
  
  if (!isValid && !user.hashedPassword) {
    console.log('\n⚠️  User has no password set. Setting password now...');
    const hashedPassword = await bcrypt.hash('teamleader123', 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword }
    });
    console.log('✅ Password has been set');
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());