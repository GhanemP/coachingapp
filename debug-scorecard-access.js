const { PrismaClient } = require('@prisma/client');

async function debugScorecardAccess() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging scorecard access for teamleader1@smartsource.com...\n');
    
    // Get the team leader user
    const teamLeader = await prisma.user.findUnique({
      where: { email: 'teamleader1@smartsource.com' },
      include: { agents: true }
    });
    
    if (!teamLeader) {
      console.log('❌ Team leader not found');
      return;
    }
    
    console.log(`✅ Team Leader: ${teamLeader.name} (${teamLeader.email})`);
    console.log(`📋 Role: ${teamLeader.role}`);
    console.log(`👥 Manages ${teamLeader.agents.length} agents:`);
    teamLeader.agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.id})`);
    });
    
    // Check the specific agent from the error
    const problemAgentId = 'cmdl4mtla000m73fsg4frt05v';
    console.log(`\n🎯 Checking access to agent: ${problemAgentId}`);
    
    const problemAgent = await prisma.user.findUnique({
      where: { id: problemAgentId },
      include: { teamLeader: true }
    });
    
    if (!problemAgent) {
      console.log('❌ Problem agent not found');
      return;
    }
    
    console.log(`📋 Agent Details:`);
    console.log(`  - Name: ${problemAgent.name}`);
    console.log(`  - Email: ${problemAgent.email}`);
    console.log(`  - Role: ${problemAgent.role}`);
    console.log(`  - Team Leader ID: ${problemAgent.teamLeaderId}`);
    console.log(`  - Team Leader: ${problemAgent.teamLeader?.name || 'None'}`);
    
    // Check if this agent is in the team leader's agents list
    const isTeamMember = teamLeader.agents.some(a => a.id === problemAgentId);
    console.log(`\n🔍 Access Check:`);
    console.log(`  - Is team member: ${isTeamMember ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Team leader ID matches: ${problemAgent.teamLeaderId === teamLeader.id ? '✅ YES' : '❌ NO'}`);
    
    // Check permissions
    console.log(`\n🔐 Permission Check:`);
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: 'TEAM_LEADER' },
      include: { permission: true }
    });
    
    const hasViewScorecards = rolePermissions.some(rp => rp.permission.name === 'view_scorecards');
    console.log(`  - view_scorecards permission: ${hasViewScorecards ? '✅ GRANTED' : '❌ MISSING'}`);
    
    // Check if there are any metrics for this agent
    console.log(`\n📊 Metrics Check:`);
    const metrics = await prisma.agentMetric.findMany({
      where: { agentId: problemAgentId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`  - Found ${metrics.length} metrics for this agent`);
    metrics.forEach(metric => {
      console.log(`    * ${metric.month}/${metric.year}: ${metric.percentage}%`);
    });
    
    // Summary
    console.log(`\n📋 SUMMARY:`);
    console.log('='.repeat(50));
    
    if (hasViewScorecards && (isTeamMember || problemAgent.teamLeaderId === teamLeader.id)) {
      console.log('✅ Access should be GRANTED - investigating further...');
      
      // Let's check the exact logic from the API route
      console.log('\n🔍 API Route Logic Check:');
      console.log(`  - session.user.role === 'TEAM_LEADER': ${teamLeader.role === 'TEAM_LEADER'}`);
      console.log(`  - agentData.id !== session.user.id: ${problemAgent.id !== teamLeader.id}`);
      console.log(`  - teamLeader?.agents.some(a => a.id === id): ${isTeamMember}`);
      
      if (teamLeader.role === 'TEAM_LEADER' && problemAgent.id !== teamLeader.id && !isTeamMember) {
        console.log('❌ FOUND THE ISSUE: Agent is not in team leader\'s agents list!');
      }
      
    } else {
      console.log('❌ Access should be DENIED');
      if (!hasViewScorecards) console.log('  - Missing view_scorecards permission');
      if (!isTeamMember && problemAgent.teamLeaderId !== teamLeader.id) console.log('  - Agent not supervised by this team leader');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugScorecardAccess();