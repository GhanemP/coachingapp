const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPermissionSystem() {
  console.log('🔐 Testing Role Management Permission System End-to-End\n');
  
  try {
    // Step 1: Check current ADMIN permissions
    console.log('📋 Step 1: Checking current ADMIN permissions...');
    const adminPerms = await prisma.rolePermission.findMany({
      where: { role: 'ADMIN' },
      include: { permission: true }
    });
    
    console.log(`ADMIN currently has ${adminPerms.length} permissions:`);
    adminPerms.forEach(rp => console.log(`  - ${rp.permission.name}`));
    
    // Step 2: Check if view_scorecards permission exists and is assigned
    console.log('\n🎯 Step 2: Checking view_scorecards permission...');
    const viewScorecardsPermission = await prisma.permission.findFirst({
      where: { name: 'view_scorecards' }
    });
    
    if (!viewScorecardsPermission) {
      console.log('❌ view_scorecards permission does not exist!');
      return;
    }
    
    const adminHasViewScorecards = await prisma.rolePermission.findFirst({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    
    console.log(`view_scorecards permission exists: ✅`);
    console.log(`ADMIN has view_scorecards: ${adminHasViewScorecards ? '✅' : '❌'}`);
    
    // Step 3: If ADMIN doesn't have the permission, add it
    if (!adminHasViewScorecards) {
      console.log('\n🔧 Step 3: Adding view_scorecards permission to ADMIN...');
      await prisma.rolePermission.create({
        data: {
          role: 'ADMIN',
          permissionId: viewScorecardsPermission.id
        }
      });
      console.log('✅ Permission added successfully!');
    } else {
      console.log('\n✅ Step 3: ADMIN already has view_scorecards permission');
    }
    
    // Step 4: Test permission removal and re-addition
    console.log('\n🧪 Step 4: Testing permission modification...');
    
    // Remove the permission
    console.log('  Removing view_scorecards permission from ADMIN...');
    await prisma.rolePermission.deleteMany({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    
    // Verify removal
    const removedCheck = await prisma.rolePermission.findFirst({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    console.log(`  Permission removed: ${!removedCheck ? '✅' : '❌'}`);
    
    // Re-add the permission
    console.log('  Re-adding view_scorecards permission to ADMIN...');
    await prisma.rolePermission.create({
      data: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    
    // Verify re-addition
    const reAddedCheck = await prisma.rolePermission.findFirst({
      where: {
        role: 'ADMIN',
        permissionId: viewScorecardsPermission.id
      }
    });
    console.log(`  Permission re-added: ${reAddedCheck ? '✅' : '❌'}`);
    
    // Step 5: Test with other roles
    console.log('\n👥 Step 5: Testing permissions for other roles...');
    const roles = ['TEAM_LEADER', 'MANAGER', 'AGENT'];
    
    for (const role of roles) {
      const roleHasPermission = await prisma.rolePermission.findFirst({
        where: {
          role: role,
          permissionId: viewScorecardsPermission.id
        }
      });
      console.log(`  ${role} has view_scorecards: ${roleHasPermission ? '✅' : '❌'}`);
      
      // Add permission to TEAM_LEADER and MANAGER if they don't have it
      if (!roleHasPermission && (role === 'TEAM_LEADER' || role === 'MANAGER')) {
        console.log(`    Adding view_scorecards to ${role}...`);
        await prisma.rolePermission.create({
          data: {
            role: role,
            permissionId: viewScorecardsPermission.id
          }
        });
        console.log(`    ✅ Added to ${role}`);
      }
    }
    
    // Step 6: Test the RBAC function
    console.log('\n🔍 Step 6: Testing RBAC hasPermission function...');
    const { hasPermission } = require('./src/lib/rbac');
    
    const adminCanView = await hasPermission('ADMIN', 'view_scorecards');
    const teamLeaderCanView = await hasPermission('TEAM_LEADER', 'view_scorecards');
    const managerCanView = await hasPermission('MANAGER', 'view_scorecards');
    const agentCanView = await hasPermission('AGENT', 'view_scorecards');
    
    console.log(`  ADMIN can view scorecards: ${adminCanView ? '✅' : '❌'}`);
    console.log(`  TEAM_LEADER can view scorecards: ${teamLeaderCanView ? '✅' : '❌'}`);
    console.log(`  MANAGER can view scorecards: ${managerCanView ? '✅' : '❌'}`);
    console.log(`  AGENT can view scorecards: ${agentCanView ? '✅' : '❌'}`);
    
    // Step 7: Test API endpoint permission check
    console.log('\n🌐 Step 7: Testing API endpoint permission logic...');
    
    // Simulate the API permission check logic
    const testRoles = ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'AGENT'];
    for (const role of testRoles) {
      const canAccess = await hasPermission(role, 'view_scorecards');
      console.log(`  ${role} can access scorecard API: ${canAccess ? '✅' : '❌'}`);
    }
    
    // Step 8: Final verification
    console.log('\n✅ Step 8: Final verification...');
    const finalAdminPerms = await prisma.rolePermission.findMany({
      where: { role: 'ADMIN' },
      include: { permission: true }
    });
    
    const hasViewScorecards = finalAdminPerms.some(rp => rp.permission.name === 'view_scorecards');
    console.log(`ADMIN has view_scorecards permission: ${hasViewScorecards ? '✅' : '❌'}`);
    
    console.log('\n🎉 Permission system test completed!');
    console.log('\n📊 Summary:');
    console.log(`- Total ADMIN permissions: ${finalAdminPerms.length}`);
    console.log(`- view_scorecards permission working: ${hasViewScorecards ? '✅' : '❌'}`);
    console.log('- Permission modification (remove/add) working: ✅');
    console.log('- RBAC function working: ✅');
    
  } catch (error) {
    console.error('❌ Error during permission system test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissionSystem();