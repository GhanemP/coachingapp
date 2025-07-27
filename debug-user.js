const { PrismaClient } = require('@prisma/client');

async function checkUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking user: teamleader1@smartsource.com');
    
    const user = await prisma.user.findUnique({
      where: { email: 'teamleader1@smartsource.com' },
      include: {
        preferences: true
      }
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Name:', user.name);
      console.log('- Role:', user.role);
      console.log('- Is Active:', user.isActive);
      console.log('- Created At:', user.createdAt);
      console.log('- Updated At:', user.updatedAt);
      console.log('- Has Password:', !!user.hashedPassword);
      console.log('- Preferences:', user.preferences);
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();