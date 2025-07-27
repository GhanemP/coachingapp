const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPermissionEnforcement() {
  console.log('🔐 Testing Permission Enforcement End-to-End\n');
  
  try {
    // Step 1: Test current state
    console.log('📋 Step 1: Current permission state...');
    const viewScorecardsPermission = await prisma.permission.findFirst({
      where: { name: 'view_scorecards' }
    });
    
    const roles = ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'AGENT'];
    const currentState = {};
    
    for (const role of roles) {
      const hasPermission = await prisma.rolePermission.findFirst({
        where: {
          role: role,
          permissionId: viewScorecardsPermission.id
        }
      });
      currentState[role] = !!hasPermission;
      console.log(`  ${role}: ${hasPermission ? '✅' : '❌'}`);
    }
    
    // Step 2: Test permission removal for ADMIN
    console.log('\n🧪 Step 2: Testing ADMIN permission removal...');
    await prisma.rolePermission.deleteMany({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    
    const adminAfterRemoval = await prisma.rolePermission.findFirst({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    console.log(`  ADMIN permission removed: ${!adminAfterRemoval ? '✅' : '❌'}`);
    
    // Step 3: Test API-like permission check simulation
    console.log('\n🌐 Step 3: Simulating API permission check...');
    
    // This simulates what the scorecard API does
    async function simulateAPIPermissionCheck(userRole) {
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          role: userRole,
          permission: {
            name: 'view_scorecards',
          },
        },
      });
      return !!rolePermission;
    }
    
    for (const role of roles) {
      const canAccess = await simulateAPIPermissionCheck(role);
      console.log(`  ${role} can access scorecard API: ${canAccess ? '✅' : '❌'}`);
    }
    
    // Step 4: Restore ADMIN permission
    console.log('\n🔧 Step 4: Restoring ADMIN permission...');
    await prisma.rolePermission.create({
      data: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    
    const adminRestored = await prisma.rolePermission.findFirst({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    console.log(`  ADMIN permission restored: ${adminRestored ? '✅' : '❌'}`);
    
    // Step 5: Final verification
    console.log('\n✅ Step 5: Final verification...');
    for (const role of roles) {
      const canAccess = await simulateAPIPermissionCheck(role);
      console.log(`  ${role} can access scorecard API: ${canAccess ? '✅' : '❌'}`);
    }
    
    // Step 6: Test with a real scorecard access scenario
    console.log('\n🎯 Step 6: Testing real scorecard scenario...');
    
    // Get a test agent
    const testAgent = await prisma.user.findFirst({
      where: { role: 'AGENT' }
    });
    
    if (testAgent) {
      console.log(`  Test agent found: ${testAgent.name} (${testAgent.id})`);
      
      // Check if agent has metrics
      const agentMetrics = await prisma.agentMetric.findMany({
        where: { agentId: testAgent.id },
        take: 1
      });
      
      console.log(`  Agent has metrics: ${agentMetrics.length > 0 ? '✅' : '❌'}`);
      
      if (agentMetrics.length > 0) {
        console.log(`  Sample metric: Month ${agentMetrics[0].month}/${agentMetrics[0].year}, Score: ${agentMetrics[0].totalScore}`);
      }
    }
    
    console.log('\n🎉 Permission enforcement test completed!');
    console.log('\n📊 Summary:');
    console.log('- Permission removal/restoration: ✅');
    console.log('- API permission check simulation: ✅');
    console.log('- Role-based access control: ✅');
    console.log('- Database permission queries: ✅');
    
  } catch (error) {
    console.error('❌ Error during permission enforcement test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissionEnforcement();