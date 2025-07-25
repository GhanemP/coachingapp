import { prisma } from '../src/lib/prisma';
import { hasPermission } from '../src/lib/rbac';
import { UserRole } from '../src/lib/constants';

async function testSessionAccess() {
  try {
    console.log('Testing session access permissions...\n');

    // Test with correct uppercase permission name
    const canViewUppercase = await hasPermission(
      UserRole.TEAM_LEADER,
      'VIEW_SESSIONS'
    );
    console.log('TEAM_LEADER can VIEW_SESSIONS (uppercase):', canViewUppercase);

    // Test with incorrect lowercase permission name (should fail)
    const canViewLowercase = await hasPermission(
      UserRole.TEAM_LEADER,
      'view_sessions'
    );
    console.log('TEAM_LEADER can view_sessions (lowercase):', canViewLowercase);

    // Test UPDATE_SESSIONS permission
    const canUpdate = await hasPermission(
      UserRole.TEAM_LEADER,
      'UPDATE_SESSIONS'
    );
    console.log('TEAM_LEADER can UPDATE_SESSIONS:', canUpdate);

    // Get session details to verify relationships
    const sessionId = 'cmdh7z6ld006273scz55u9ay6';
    const session = await prisma.coachingSession.findUnique({
      where: { id: sessionId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            teamLeaderId: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (session) {
      console.log('\nSession verification:');
      console.log(`- Session conducted by: ${session.teamLeader.name} (${session.teamLeader.id})`);
      console.log(`- Agent: ${session.agent.name} (${session.agent.id})`);
      console.log(`- Agent's team leader ID: ${session.agent.teamLeaderId}`);
      console.log(`- Match: ${session.agent.teamLeaderId === session.teamLeader.id ? 'YES ✓' : 'NO ✗'}`);
    }

    console.log('\n✅ The fix should now allow team leaders to access session details!');

  } catch (error) {
    console.error('Error testing session access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSessionAccess();