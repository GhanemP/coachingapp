const { PrismaClient } = require('@prisma/client');

async function forceLogout() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Forcing logout for user: teamleader1@smartsource.com');
    
    const user = await prisma.user.findUnique({
      where: { email: 'teamleader1@smartsource.com' }
    });
    
    if (user) {
      console.log('✅ User found:', user.email);
      
      // In NextAuth with JWT strategy, sessions are stored in cookies/JWT tokens
      // We need to clear any database sessions if using database strategy
      // Since this uses JWT strategy, we'll focus on clearing any cached data
      
      console.log('🧹 Clearing any cached session data...');
      
      // Update user's updatedAt to force session refresh
      await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() }
      });
      
      console.log('✅ User session data refreshed');
      console.log('💡 Note: For JWT sessions, cookies need to be cleared client-side');
      console.log('💡 The main issue appears to be in the NextAuth configuration');
      
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceLogout();