const { PrismaClient } = require('@prisma/client');

async function testApiEndpoints() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing API endpoints for TEAM_LEADER permissions...\n');
    
    // Get the team leader user
    const user = await prisma.user.findUnique({
      where: { email: 'teamleader1@smartsource.com' },
      include: { agents: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`📋 Role: ${user.role}`);
    console.log(`👥 Manages ${user.agents.length} agents\n`);
    
    // Test 1: Check permissions
    console.log('🔍 Testing permissions...');
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: 'TEAM_LEADER' },
      include: { permission: true }
    });
    
    const requiredPermissions = ['view_sessions', 'view_agents', 'view_scorecards', 'manage_sessions'];
    const permissionResults = {};
    
    requiredPermissions.forEach(permName => {
      const hasPermission = rolePermissions.some(rp => rp.permission.name === permName);
      permissionResults[permName] = hasPermission;
      console.log(`  - ${permName}: ${hasPermission ? '✅' : '❌'}`);
    });
    
    // Test 2: Check if user has agents to access
    console.log('\n👥 Testing agent access...');
    if (user.agents.length > 0) {
      const firstAgent = user.agents[0];
      console.log(`  - Can access agent: ${firstAgent.id} ✅`);
      
      // Test 3: Check if there are sessions to access
      console.log('\n📅 Testing session access...');
      const sessions = await prisma.coachingSession.findMany({
        where: {
          OR: [
            { teamLeaderId: user.id },
            { agentId: { in: user.agents.map(a => a.id) } }
          ]
        },
        take: 5
      });
      
      console.log(`  - Found ${sessions.length} accessible sessions`);
      sessions.forEach(session => {
        console.log(`    * Session ${session.id} (${session.status})`);
      });
      
      // Test 4: Check agent metrics/scorecards
      console.log('\n📊 Testing scorecard access...');
      const metrics = await prisma.agentMetric.findMany({
        where: {
          agentId: { in: user.agents.map(a => a.id) }
        },
        take: 5
      });
      
      console.log(`  - Found ${metrics.length} agent metrics`);
      metrics.forEach(metric => {
        console.log(`    * Agent ${metric.agentId}: ${metric.month}/${metric.year} - ${metric.percentage}%`);
      });
      
    } else {
      console.log('  - ⚠️ No agents assigned to this team leader');
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(50));
    
    const allPermissionsGranted = Object.values(permissionResults).every(Boolean);
    console.log(`Permissions: ${allPermissionsGranted ? '✅ ALL GRANTED' : '❌ SOME MISSING'}`);
    console.log(`Agent Access: ${user.agents.length > 0 ? '✅ HAS AGENTS' : '⚠️ NO AGENTS'}`);
    
    if (allPermissionsGranted && user.agents.length > 0) {
      console.log('\n🎉 All checks passed! API endpoints should work correctly.');
    } else {
      console.log('\n⚠️ Issues found that may cause 403 errors.');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiEndpoints();