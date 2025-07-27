import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAllPasswords() {
  const users = [
    { email: 'admin@company.com', password: 'admin123' },
    { email: 'manager1@company.com', password: 'manager123' },
    { email: 'teamleader1@company.com', password: 'teamleader123' },
    { email: 'agent1@company.com', password: 'agent123' },
    { email: 'agent2@company.com', password: 'agent123' },
  ];

  console.log('Resetting passwords for all test users...\n');

  for (const { email, password } of users) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.update({
        where: { email },
        data: { hashedPassword }
      });
      
      console.log(`✅ Reset password for: ${email} (${user.role})`);
    } catch (error) {
      console.log(`❌ Failed to reset password for: ${email}`);
      console.error(error);
    }
  }
  
  console.log('\n✅ All passwords have been reset!');
  console.log('\nYou can now log in with any of these users using the passwords from TEST_USERS.md');
}

resetAllPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());