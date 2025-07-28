import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'teamleader1@company.com';
  const newPassword = 'teamleader123';

  console.log(`Resetting password for: ${email}`);

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { hashedPassword },
  });

  console.log('✅ Password reset successfully');
  console.log('User details:', {
    email: user.email,
    name: user.name,
    role: user.role,
  });

  // Verify the new password
  const isValid = await bcrypt.compare(newPassword, hashedPassword);
  console.log('Password verification:', isValid ? '✅ Valid' : '❌ Invalid');
}

resetPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
