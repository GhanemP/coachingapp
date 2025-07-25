import { prisma } from '../src/lib/prisma';
import { UserRole } from '../src/lib/constants';

async function checkPermissions() {
  try {
    console.log('Checking permissions for TEAM_LEADER role...\n');

    // Check if view_sessions permission exists
    const viewSessionsPermission = await prisma.permission.findFirst({
      where: {
        name: 'view_sessions'
      }
    });

    console.log('view_sessions permission:', viewSessionsPermission);

    // Check if TEAM_LEADER has view_sessions permission
    if (viewSessionsPermission) {
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          role: UserRole.TEAM_LEADER,
          permissionId: viewSessionsPermission.id
        }
      });

      console.log('\nTEAM_LEADER has view_sessions permission:', !!rolePermission);
    }

    // Get all permissions for TEAM_LEADER
    const teamLeaderPermissions = await prisma.rolePermission.findMany({
      where: {
        role: UserRole.TEAM_LEADER
      },
      include: {
        permission: true
      }
    });

    console.log('\nAll TEAM_LEADER permissions:');
    teamLeaderPermissions.forEach(rp => {
      console.log(`- ${rp.permission.name} (${rp.permission.resource}:${rp.permission.action})`);
    });

    // Check specific session
    const sessionId = 'cmdh7z6ld006273scz55u9ay6';
    const session = await prisma.coachingSession.findUnique({
      where: { id: sessionId },
      include: {
        agent: true,
        teamLeader: true
      }
    });

    if (session) {
      console.log('\nSession details:');
      console.log(`- Session ID: ${session.id}`);
      console.log(`- Agent: ${session.agent.name} (${session.agent.id})`);
      console.log(`- Team Leader: ${session.teamLeader.name} (${session.teamLeader.id})`);
      console.log(`- Status: ${session.status}`);

      // Check if agent has a teamLeaderId
      const agentWithTeamLeader = await prisma.user.findUnique({
        where: { id: session.agentId },
        select: { teamLeaderId: true, name: true }
      });

      console.log(`\nAgent's assigned Team Leader ID: ${agentWithTeamLeader?.teamLeaderId || 'None'}`);
    } else {
      console.log('\nSession not found!');
    }

    // Get a team leader user to test
    const teamLeader = await prisma.user.findFirst({
      where: { role: UserRole.TEAM_LEADER }
    });

    if (teamLeader) {
      console.log(`\nTesting with Team Leader: ${teamLeader.name} (${teamLeader.id})`);
      
      // Check agents under this team leader
      const supervisedAgents = await prisma.user.findMany({
        where: { teamLeaderId: teamLeader.id },
        select: { id: true, name: true }
      });

      console.log(`\nAgents supervised by this Team Leader:`);
      supervisedAgents.forEach(agent => {
        console.log(`- ${agent.name} (${agent.id})`);
      });
    }

  } catch (error) {
    console.error('Error checking permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();