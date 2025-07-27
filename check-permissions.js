const { PrismaClient } = require('@prisma/client');

async function checkPermissions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking permissions for TEAM_LEADER role...');
    
    // Get all permissions for TEAM_LEADER role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: 'TEAM_LEADER' },
      include: { permission: true }
    });
    
    console.log('\n✅ Current TEAM_LEADER permissions:');
    rolePermissions.forEach(rp => {
      console.log(`- ${rp.permission.name} (${rp.permission.resource}:${rp.permission.action})`);
    });
    
    // Check specific permissions that are failing
    const requiredPermissions = [
      'VIEW_SESSIONS',
      'view_agents',
      'view_scorecards'
    ];
    
    console.log('\n🔍 Checking required permissions:');
    for (const permName of requiredPermissions) {
      const hasPermission = rolePermissions.some(rp => rp.permission.name === permName);
      console.log(`- ${permName}: ${hasPermission ? '✅ GRANTED' : '❌ MISSING'}`);
    }
    
    // Get all available permissions
    console.log('\n📋 All available permissions in system:');
    const allPermissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' }
    });
    
    allPermissions.forEach(perm => {
      const granted = rolePermissions.some(rp => rp.permission.id === perm.id);
      console.log(`- ${perm.name} (${perm.resource}:${perm.action}) ${granted ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();